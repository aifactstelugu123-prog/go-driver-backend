const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const Owner = require('../models/Owner');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const SpeedViolation = require('../models/SpeedViolation');
const AdminConfig = require('../models/AdminConfig');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// All admin routes require admin auth
router.use(protect, authorize('admin'));

// ─── DRIVERS ─────────────────────────────────────────────────

// GET /api/admin/drivers?approved=true/false
router.get('/drivers', async (req, res) => {
    try {
        const filter = {};
        if (req.query.approved === 'false') filter.isApproved = false;
        if (req.query.approved === 'true') filter.isApproved = true;
        if (req.query.blocked === 'true') filter.isBlocked = true;

        const drivers = await Driver.find(filter)
            .select('-otp -otpExpiry')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: drivers.length, drivers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/drivers/:id/approve
router.put('/drivers/:id/approve', async (req, res) => {
    try {
        const driver = await Driver.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });
        res.json({ success: true, message: 'Driver approved.', driver });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/drivers/:id/block
router.put('/drivers/:id/block', async (req, res) => {
    try {
        const driver = await Driver.findByIdAndUpdate(req.params.id, { isBlocked: true, isOnline: false }, { new: true });
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });
        res.json({ success: true, message: 'Driver blocked.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/drivers/:id/unblock
router.put('/drivers/:id/unblock', async (req, res) => {
    try {
        const driver = await Driver.findByIdAndUpdate(req.params.id, { isBlocked: false }, { new: true });
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });
        res.json({ success: true, message: 'Driver unblocked.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── OWNERS ──────────────────────────────────────────────────

// GET /api/admin/owners
router.get('/owners', async (req, res) => {
    try {
        const owners = await Owner.find().select('-otp -otpExpiry').sort({ createdAt: -1 });
        res.json({ success: true, count: owners.length, owners });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/admin/owners/:id
router.get('/owners/:id', async (req, res) => {
    try {
        const owner = await Owner.findById(req.params.id).select('-otp -otpExpiry');
        if (!owner) return res.status(404).json({ success: false, message: 'Owner not found.' });
        res.json({ success: true, owner });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ORDERS / LIVE RIDES ────────────────────────────────────

// GET /api/admin/orders
router.get('/orders', async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        const orders = await Order.find(filter)
            .populate('ownerId', 'name phone')
            .populate('driverId', 'name phone currentLocation')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json({ success: true, count: orders.length, orders });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── SPEED VIOLATIONS ───────────────────────────────────────

// GET /api/admin/violations
router.get('/violations', async (req, res) => {
    try {
        const violations = await SpeedViolation.find()
            .populate('driverId', 'name phone')
            .populate('orderId', 'vehicleType pickupLocation dropLocation')
            .sort({ createdAt: -1 })
            .limit(200);
        res.json({ success: true, count: violations.length, violations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── SUBSCRIPTIONS ──────────────────────────────────────────

// GET /api/admin/subscriptions
router.get('/subscriptions', async (req, res) => {
    try {
        const subs = await Subscription.find()
            .populate('driverId', 'name phone')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: subs.length, subscriptions: subs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ANALYTICS DASHBOARD ────────────────────────────────────

// GET /api/admin/analytics
router.get('/analytics', async (req, res) => {
    try {
        const [
            totalDrivers, approvedDrivers, pendingDrivers, blockedDrivers,
            totalOwners, totalOrders, activeOrders, completedOrders,
            totalViolations, totalSubscriptions,
        ] = await Promise.all([
            Driver.countDocuments(),
            Driver.countDocuments({ isApproved: true }),
            Driver.countDocuments({ isApproved: false }),
            Driver.countDocuments({ isBlocked: true }),
            Owner.countDocuments(),
            Order.countDocuments(),
            Order.countDocuments({ status: 'Active' }),
            Order.countDocuments({ status: 'Completed' }),
            SpeedViolation.countDocuments(),
            Subscription.countDocuments({ isActive: true }),
        ]);

        // Revenue
        const revenueResult = await Order.aggregate([
            { $match: { status: 'Completed', platformCommission: { $exists: true } } },
            { $group: { _id: null, totalRevenue: { $sum: '$platformCommission' }, totalFare: { $sum: '$finalAmount' } } },
        ]);
        const revenue = revenueResult[0] || { totalRevenue: 0, totalFare: 0 };

        // Subscription revenue
        const subRevenue = await Subscription.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$price' } } },
        ]);

        // Recent rides trend (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const rideTrend = await Order.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        res.json({
            success: true,
            analytics: {
                drivers: { total: totalDrivers, approved: approvedDrivers, pending: pendingDrivers, blocked: blockedDrivers },
                owners: { total: totalOwners },
                orders: { total: totalOrders, active: activeOrders, completed: completedOrders },
                violations: { total: totalViolations },
                subscriptions: { active: totalSubscriptions },
                revenue: {
                    platformEarnings: revenue.totalRevenue,
                    totalFareProcessed: revenue.totalFare,
                    subscriptionRevenue: subRevenue[0]?.total || 0,
                },
                rideTrend,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── PLATFORM EARNINGS & BANK DETAILS ───────────────────────

// GET /api/admin/earnings — total platform commission + bank details
router.get('/earnings', async (req, res) => {
    try {
        // Aggregate platform commission from all completed rides
        const [rideEarnings, subRevenue] = await Promise.all([
            Order.aggregate([
                { $match: { status: 'Completed' } },
                { $group: { _id: null, total: { $sum: '$platformCommission' }, rides: { $sum: 1 } } },
            ]),
            Subscription.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: '$price' } } },
            ]),
        ]);

        const rideCommission = rideEarnings[0]?.total || 0;
        const subscriptionIncome = subRevenue[0]?.total || 0;
        const totalEarnings = rideCommission + subscriptionIncome;

        // Get admin config (bank + settlements)
        const config = await AdminConfig.findOne();
        const settledAmount = config?.settlements?.reduce((s, x) => s + x.amount, 0) || 0;

        res.json({
            success: true,
            earnings: {
                rideCommission: rideCommission.toFixed(2),
                subscriptionIncome: subscriptionIncome.toFixed(2),
                totalEarnings: totalEarnings.toFixed(2),
                settledAmount: settledAmount.toFixed(2),
                pendingSettlement: (totalEarnings - settledAmount).toFixed(2),
                completedRides: rideEarnings[0]?.rides || 0,
            },
            bankDetails: config?.bankDetails || null,
            settlements: config?.settlements?.sort((a, b) => b.settledAt - a.settledAt) || [],
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin/bank-details — save admin bank details
router.post('/bank-details', async (req, res) => {
    try {
        const { accountHolderName, accountNumber, ifscCode, bankName, upiId } = req.body;
        if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
            return res.status(400).json({ success: false, message: 'All bank fields are required.' });
        }
        let config = await AdminConfig.findOne();
        if (!config) config = new AdminConfig();
        config.bankDetails = { accountHolderName, accountNumber, ifscCode: ifscCode.toUpperCase(), bankName, upiId: upiId || '' };
        await config.save();
        res.json({ success: true, message: 'Admin bank details saved successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin/mark-settled — mark an amount as settled (transferred to admin bank)
router.post('/mark-settled', async (req, res) => {
    try {
        const { amount, note } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount.' });
        let config = await AdminConfig.findOne();
        if (!config) config = new AdminConfig();
        config.settlements.push({ amount: parseFloat(amount), note: note || 'Manual settlement' });
        await config.save();
        res.json({ success: true, message: `₹${amount} marked as settled.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
