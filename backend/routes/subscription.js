const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const Driver = require('../models/Driver');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { SUBSCRIPTION_PLANS } = require('../config/constants');
const { createRazorpayOrder, verifyPaymentSignature } = require('../services/razorpayService');

// POST /api/subscription/create-order — Initiate payment
router.post('/create-order', protect, authorize('driver'), async (req, res) => {
    try {
        const { plan } = req.body;
        if (!SUBSCRIPTION_PLANS[plan] || plan === 'free_trial')
            return res.status(400).json({ success: false, message: 'Invalid plan. Choose: basic, standard, or premium.' });

        const driver = await Driver.findById(req.user.id);
        if (!driver.isApproved)
            return res.status(403).json({ success: false, message: 'Driver not approved yet.' });

        const planData = SUBSCRIPTION_PLANS[plan];
        const receipt = `sub_${driver._id}_${Date.now()}`;

        const razorpayOrder = await createRazorpayOrder(planData.price, receipt);

        res.json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            amount: planData.price,
            currency: 'INR',
            plan,
            planName: planData.name,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/subscription/verify — Verify and activate
router.post('/verify', protect, authorize('driver'), async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } = req.body;

        const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
        if (!isValid)
            return res.status(400).json({ success: false, message: 'Payment verification failed.' });

        const planData = SUBSCRIPTION_PLANS[plan];
        const driver = await Driver.findById(req.user.id);

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + planData.days);

        // Deactivate old subscription
        if (driver.currentSubscriptionId) {
            await Subscription.findByIdAndUpdate(driver.currentSubscriptionId, { isActive: false });
        }

        const sub = await Subscription.create({
            driverId: driver._id,
            plan,
            planName: planData.name,
            price: planData.price,
            rideLimit: planData.rideLimit,
            ridesAssigned: 0,
            isFreeTrial: false,
            isActive: true,
            expiryDate: expiry,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            paymentStatus: 'paid',
        });

        driver.currentSubscriptionId = sub._id;
        driver.ridesAssigned = 0;
        driver.rideLimit = planData.rideLimit;
        driver.subscriptionExpiry = expiry;
        await driver.save();

        res.json({
            success: true,
            message: `${planData.name} plan activated! You have ${planData.rideLimit} Minimum Ride Opportunities.`,
            subscription: sub,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/subscription/plans — List all plans
router.get('/plans', (req, res) => {
    res.json({ success: true, plans: SUBSCRIPTION_PLANS });
});

module.exports = router;
