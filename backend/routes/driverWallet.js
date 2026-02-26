const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const Driver = require('../models/Driver');
const Payout = require('../models/Payout');
const Razorpay = require('razorpay');

let razorpay;
try {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    } else {
        console.warn('⚠️ Razorpay keys missing in driverWallet.js. Mocking Razorpay service.');
        razorpay = { orders: { create: async () => ({ id: 'mock_driver_wallet_order_123', amount: 50000 }) } };
    }
} catch (e) {
    razorpay = { orders: { create: async () => ({ id: 'mock_driver_wallet_order_123', amount: 50000 }) } };
}

const { encrypt, decrypt, maskData } = require('../services/encryptionService');

// ─────────────────────────────────────────────────────────────────────
// GET /api/driver-wallet — balance + transactions + bank info (masked)
// ─────────────────────────────────────────────────────────────────────
router.get('/', protect, authorize('driver'), async (req, res) => {
    try {
        const driver = await Driver.findById(req.user.id)
            .select('walletBalance walletTransactions bankDetails name phone');
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });

        // Return masked account number
        const bank = driver.bankDetails?.accountNumberEnc
            ? {
                accountHolderName: driver.bankDetails.accountHolderName,
                accountNumberMasked: maskData(decrypt(driver.bankDetails.accountNumberEnc)),
                ifscCode: driver.bankDetails.ifscCode,
                bankName: driver.bankDetails.bankName,
                upiId: driver.bankDetails.upiId,
                isVerified: driver.bankDetails.isVerified,
            }
            : null;

        res.json({
            success: true,
            walletBalance: driver.walletBalance,
            transactions: driver.walletTransactions.sort((a, b) => b.createdAt - a.createdAt),
            bankDetails: bank,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/driver-wallet/bank-details — save/update encrypted bank details
// ─────────────────────────────────────────────────────────────────────
router.post('/bank-details', protect, authorize('driver'), async (req, res) => {
    try {
        const { accountHolderName, accountNumber, ifscCode, bankName, upiId } = req.body;
        if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
            return res.status(400).json({ success: false, message: 'Account holder name, account number, IFSC, and bank name are required.' });
        }
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
            return res.status(400).json({ success: false, message: 'Invalid IFSC code format.' });
        }

        const driver = await Driver.findById(req.user.id);
        driver.bankDetails = {
            accountHolderName: accountHolderName.trim(),
            accountNumberEnc: encrypt(accountNumber.trim()),
            ifscCode: ifscCode.toUpperCase().trim(),
            bankName: bankName.trim(),
            upiId: upiId?.trim() || '',
            isVerified: false, // admin verifies
        };
        await driver.save();

        res.json({ success: true, message: 'Bank details saved securely (AES-256 encrypted).' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/driver-wallet/request-payout — driver requests withdrawal
// ─────────────────────────────────────────────────────────────────────
router.post('/request-payout', protect, authorize('driver'), async (req, res) => {
    try {
        const { amount } = req.body;
        const driver = await Driver.findById(req.user.id);

        if (!driver.bankDetails?.accountNumberEnc) {
            return res.status(400).json({ success: false, message: 'Please add your bank details before requesting a payout.' });
        }
        if (!amount || amount < 100) {
            return res.status(400).json({ success: false, message: 'Minimum payout amount is ₹100.' });
        }
        if (driver.walletBalance < amount) {
            return res.status(400).json({ success: false, message: `Insufficient balance. Available: ₹${driver.walletBalance}.` });
        }

        // Check no pending payout exists
        const pending = await Payout.findOne({ driverId: req.user.id, status: 'pending' });
        if (pending) {
            return res.status(400).json({ success: false, message: 'You already have a pending payout request.' });
        }

        const accountNumber = decrypt(driver.bankDetails.accountNumberEnc);
        const payout = new Payout({
            driverId: req.user.id,
            amount: parseFloat(amount),
            bankSnapshot: {
                accountHolderName: driver.bankDetails.accountHolderName,
                accountNumberMasked: maskData(accountNumber),
                ifscCode: driver.bankDetails.ifscCode,
                bankName: driver.bankDetails.bankName,
                upiId: driver.bankDetails.upiId,
            },
        });

        // Reserve the amount (hold from wallet)
        driver.walletBalance -= parseFloat(amount);
        driver.walletTransactions.push({
            type: 'debit',
            amount: parseFloat(amount),
            description: 'Payout request (pending approval)',
        });

        await Promise.all([payout.save(), driver.save()]);

        res.json({ success: true, message: `₹${amount} payout request submitted. Admin will review and transfer within 24–48 hours.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/driver-wallet/recharge — create Razorpay order
// ─────────────────────────────────────────────────────────────────────
router.post('/recharge', protect, authorize('driver'), async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount < 10) return res.status(400).json({ success: false, message: 'Minimum recharge amount is ₹10.' });

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: `driver_wallet_${req.user.id}_${Date.now()}`,
            notes: { driverId: req.user.id, type: 'driver_wallet_recharge' },
        });

        res.json({ success: true, razorpayOrderId: order.id, amount, keyId: process.env.RAZORPAY_KEY_ID });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/driver-wallet/recharge/verify — verify payment & credit wallet
// ─────────────────────────────────────────────────────────────────────
router.post('/recharge/verify', protect, authorize('driver'), async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = req.body;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed.' });
        }

        const driver = await Driver.findById(req.user.id);
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });

        driver.walletBalance += parseFloat(amount);
        driver.walletTransactions.push({
            type: 'credit',
            amount: parseFloat(amount),
            description: 'Wallet recharge via Razorpay',
            razorpayPaymentId,
        });
        await driver.save();

        res.json({ success: true, message: `₹${amount} added successfully!`, walletBalance: driver.walletBalance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/driver-wallet/payouts — driver's payout history
// ─────────────────────────────────────────────────────────────────────
router.get('/payouts', protect, authorize('driver'), async (req, res) => {
    try {
        const payouts = await Payout.find({ driverId: req.user.id }).sort({ requestedAt: -1 });
        res.json({ success: true, payouts });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────────────

// GET /api/driver-wallet/admin/payouts — all pending payouts
router.get('/admin/payouts', protect, authorize('admin'), async (req, res) => {
    try {
        const { status } = req.query;
        const filter = status ? { status } : {};
        const payouts = await Payout.find(filter).populate('driverId', 'name phone').sort({ requestedAt: -1 });
        res.json({ success: true, payouts });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/driver-wallet/admin/payouts/:id/approve — admin approves
router.post('/admin/payouts/:id/approve', protect, authorize('admin'), async (req, res) => {
    try {
        const { note } = req.body;
        const payout = await Payout.findById(req.params.id);
        if (!payout) return res.status(404).json({ success: false, message: 'Payout not found.' });
        if (payout.status !== 'pending') return res.status(400).json({ success: false, message: 'Payout is not in pending state.' });

        payout.status = 'approved';
        payout.adminNote = note || 'Approved';
        payout.processedAt = new Date();
        payout.processedBy = req.user.email || 'admin';
        await payout.save();

        res.json({ success: true, message: 'Payout approved. Mark as transferred after bank transfer.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/driver-wallet/admin/payouts/:id/transfer — admin marks as transferred
router.post('/admin/payouts/:id/transfer', protect, authorize('admin'), async (req, res) => {
    try {
        const payout = await Payout.findById(req.params.id);
        if (!payout) return res.status(404).json({ success: false, message: 'Payout not found.' });
        if (payout.status !== 'approved') return res.status(400).json({ success: false, message: 'Payout must be approved first.' });

        payout.status = 'transferred';
        payout.transferredAt = new Date();
        await payout.save();

        // Add credit transaction to driver's history (record only — balance already deducted)
        await Driver.findByIdAndUpdate(payout.driverId, {
            $push: {
                walletTransactions: {
                    type: 'debit',
                    amount: 0,
                    description: `₹${payout.amount} transferred to bank ✅`,
                }
            }
        });

        res.json({ success: true, message: `₹${payout.amount} marked as transferred to driver.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/driver-wallet/admin/payouts/:id/reject — admin rejects
router.post('/admin/payouts/:id/reject', protect, authorize('admin'), async (req, res) => {
    try {
        const { reason } = req.body;
        const payout = await Payout.findById(req.params.id);
        if (!payout) return res.status(404).json({ success: false, message: 'Payout not found.' });
        if (payout.status !== 'pending') return res.status(400).json({ success: false, message: 'Payout is not pending.' });

        // Refund the held amount back to driver wallet
        await Driver.findByIdAndUpdate(payout.driverId, {
            $inc: { walletBalance: payout.amount },
            $push: {
                walletTransactions: {
                    type: 'credit',
                    amount: payout.amount,
                    description: `Payout refund — ${reason || 'Rejected by admin'}`,
                }
            }
        });

        payout.status = 'rejected';
        payout.adminNote = reason || 'Rejected';
        payout.processedAt = new Date();
        payout.processedBy = req.user.email || 'admin';
        await payout.save();

        res.json({ success: true, message: 'Payout rejected. Amount refunded to driver wallet.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
