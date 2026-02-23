const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const Owner = require('../models/Owner');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// GET /api/wallet — get wallet balance + transactions
router.get('/', protect, authorize('owner'), async (req, res) => {
    try {
        const owner = await Owner.findById(req.user.id).select('walletBalance walletTransactions name phone');
        if (!owner) return res.status(404).json({ success: false, message: 'Owner not found.' });
        res.json({
            success: true,
            walletBalance: owner.walletBalance,
            transactions: owner.walletTransactions.sort((a, b) => b.createdAt - a.createdAt),
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/wallet/recharge — create Razorpay order to add money
router.post('/recharge', protect, authorize('owner'), async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount < 10) return res.status(400).json({ success: false, message: 'Minimum recharge amount is ₹10.' });

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: `wallet_${req.user.id}_${Date.now()}`,
            notes: { ownerId: req.user.id, type: 'wallet_recharge' },
        });

        res.json({ success: true, razorpayOrderId: order.id, amount, keyId: process.env.RAZORPAY_KEY_ID });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/wallet/deposit — simulated top-up (Add Cash)
router.post('/deposit', protect, authorize('owner'), async (req, res) => {
    try {
        const { amount, paymentMethod } = req.body;
        if (!amount || amount < 10) return res.status(400).json({ success: false, message: 'Minimum deposit is ₹10.' });

        const owner = await Owner.findById(req.user.id);
        if (!owner) return res.status(404).json({ success: false, message: 'Owner not found.' });

        owner.walletBalance += parseFloat(amount);
        owner.walletTransactions.push({
            type: 'credit',
            amount: parseFloat(amount),
            description: `Wallet top-up (${paymentMethod || 'UPI'}) — Simulated`,
        });
        await owner.save();

        res.json({ success: true, message: `₹${amount} added successfully!`, walletBalance: owner.walletBalance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/wallet/recharge/verify — verify payment & credit wallet
router.post('/recharge/verify', protect, authorize('owner'), async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = req.body;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed.' });
        }

        const owner = await Owner.findById(req.user.id);
        owner.walletBalance += parseFloat(amount);
        owner.walletTransactions.push({
            type: 'credit',
            amount: parseFloat(amount),
            description: 'Wallet recharge via Razorpay',
            razorpayPaymentId,
        });
        await owner.save();

        res.json({ success: true, message: `₹${amount} added to your wallet!`, walletBalance: owner.walletBalance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/wallet/pay-ride — deduct fare from wallet for completed ride
router.post('/pay-ride', protect, authorize('owner'), async (req, res) => {
    try {
        const { orderId, amount } = req.body;
        const owner = await Owner.findById(req.user.id);

        if (owner.walletBalance < amount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient wallet balance. Available: ₹${owner.walletBalance}. Required: ₹${amount}.`,
            });
        }

        owner.walletBalance -= parseFloat(amount);
        owner.walletTransactions.push({ type: 'debit', amount: parseFloat(amount), description: 'Ride payment', orderId });
        await owner.save();

        res.json({ success: true, message: `₹${amount} deducted from wallet.`, walletBalance: owner.walletBalance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
