const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Driver = require('../models/Driver');
const Subscription = require('../models/Subscription');
const Owner = require('../models/Owner');
const SpeedViolation = require('../models/SpeedViolation');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { verifyRideDrop, calculateReturnDistance } = require('../services/matchingEngine');
const { calculateFare } = require('../services/fareService');

// POST /api/rides/:id/accept — Driver accepts ride
router.post('/:id/accept', protect, authorize('driver'), async (req, res) => {
    try {
        const driver = await Driver.findById(req.user.id);
        const now = new Date();

        if (!driver.isApproved) return res.status(403).json({ success: false, message: 'Driver not approved.' });
        if (driver.isBlocked) return res.status(403).json({ success: false, message: 'Driver is blocked.' });
        if (!driver.subscriptionExpiry || driver.subscriptionExpiry < now)
            return res.status(403).json({ success: false, message: 'Subscription expired. Please renew.' });
        if (driver.ridesAssigned >= driver.rideLimit)
            return res.status(403).json({ success: false, message: 'Minimum Ride Opportunity limit reached. Please upgrade plan.' });

        // Atomically update order: only succeed if still Searching
        const order = await Order.findOneAndUpdate(
            { _id: req.params.id, status: 'Searching' },
            { status: 'Accepted', driverId: driver._id },
            { new: true }
        );

        if (!order) return res.status(409).json({ success: false, message: 'Ride no longer available.' });

        // Increment rides assigned
        await Subscription.findByIdAndUpdate(driver.currentSubscriptionId, { $inc: { ridesAssigned: 1 } });
        driver.ridesAssigned += 1;
        await driver.save();

        // Notify owner via Socket.io
        const io = req.app.get('io');
        const ownerSocket = req.app.get('ownerSocket');
        if (io && ownerSocket) {
            const sid = ownerSocket.get(order.ownerId.toString());
            if (sid) {
                io.to(sid).emit('ride:accepted', {
                    orderId: order._id,
                    driver: {
                        id: driver._id,
                        name: driver.name,
                        phone: driver.phone,
                        profilePhoto: driver.profilePhoto,
                        rating: driver.rating || 5,
                        trainingBadge: driver.trainingBadge || false
                    },
                });
            }
        }

        res.json({ success: true, message: 'Ride accepted!', order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/rides/:id/start — Driver enters start OTP
router.post('/:id/start', protect, authorize('driver'), async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const order = await Order.findOne({ _id: req.params.id, driverId: req.user.id, status: 'Accepted' });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found or already started.' });

        order.status = 'Active';
        order.rideStartTime = new Date();
        order.rideStartLocation = { lat: Number(lat), lng: Number(lng) };
        order.startOtp = undefined;
        order.startOtpExpiry = undefined;
        await order.save();

        // Notify owner
        const io = req.app.get('io');
        const ownerSocket = req.app.get('ownerSocket');
        if (io && ownerSocket) {
            const sid = ownerSocket.get(order.ownerId.toString());
            if (sid) io.to(sid).emit('ride:started', { orderId: order._id, rideStartTime: order.rideStartTime });
        }

        res.json({ success: true, message: 'Ride started!', order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/rides/:id/end — Driver enters end OTP + fare calculation
router.post('/:id/end', protect, authorize('driver'), async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const order = await Order.findOne({ _id: req.params.id, driverId: req.user.id, status: 'Active' })
            .populate('driverId');

        if (!order) return res.status(404).json({ success: false, message: 'Active order not found.' });

        // ─── ROUND TRIP TURNAROUND LOGIC ───────────────────────
        if (order.isRoundTrip && !order.isReturnLeg) {
            order.isReturnLeg = true;
            order.turnaroundTime = new Date();
            order.endOtp = undefined;
            order.endOtpExpiry = undefined;
            await order.save();

            const io = req.app.get('io');
            const ownerSocket = req.app.get('ownerSocket');
            if (io && ownerSocket) {
                const sid = ownerSocket.get(order.ownerId.toString());
                if (sid) io.to(sid).emit('ride:turnaround', { orderId: order._id, turnaroundTime: order.turnaroundTime });
            }

            return res.json({
                success: true,
                message: 'Turnaround point reached! Navigate back to pickup location.',
                order
            });
        }

        const rideEndLocation = { lat: Number(lat), lng: Number(lng) };
        const rideEndTime = new Date();

        // GPS drop verification
        const dropVerification = verifyRideDrop(
            rideEndLocation,
            order.isRoundTrip ? order.pickupLocation : order.dropLocation, // Verify at pickup if round trip
            order.pickupLocation
        );

        let returnDistance = 0;
        if (dropVerification === 'ReturnCharged') {
            const driver = await Driver.findById(req.user.id);
            if (driver.homeLocation && driver.homeLocation.lat) {
                returnDistance = calculateReturnDistance(order.dropLocation, driver.homeLocation);
            }
        }

        const fareData = calculateFare({
            rideStartTime: order.rideStartTime,
            rideEndTime,
            vehicleType: order.vehicleType,
            dropVerification,
            returnDistance,
        });

        // ── Transactional Update — Deduct from Owner, Credit to Driver ──
        const owner = await Owner.findById(order.ownerId);
        if (owner) {
            owner.walletBalance -= fareData.finalAmount;
            owner.walletTransactions.push({
                type: 'debit',
                amount: fareData.finalAmount,
                description: `Ride payment — Order #${order._id.toString().slice(-8).toUpperCase()}`,
                orderId: order._id
            });
            await owner.save();
        }

        order.rideEndTime = rideEndTime;
        order.rideEndLocation = rideEndLocation;
        order.status = 'Completed';
        order.dropVerification = dropVerification;
        order.returnDistance = fareData.returnDistance;
        Object.assign(order, fareData);
        order.endOtp = undefined;
        order.endOtpExpiry = undefined;
        await order.save();

        // Update driver stats + auto-credit wallet with earnings
        await Driver.findByIdAndUpdate(req.user.id, {
            $inc: {
                totalRidesCompleted: 1,
                totalEarnings: fareData.driverEarnings,
                walletBalance: fareData.driverEarnings,   // ← AUTO CREDIT WALLET
            },
            $push: {
                walletTransactions: {
                    type: 'credit',
                    amount: fareData.driverEarnings,
                    description: `Ride earnings — ₹${fareData.driverEarnings} credited`,
                    orderId: order._id,
                }
            }
        });

        // Notify owner
        const io = req.app.get('io');
        const ownerSocket = req.app.get('ownerSocket');
        if (io && ownerSocket) {
            const sid = ownerSocket.get(order.ownerId.toString());
            if (sid) io.to(sid).emit('ride:completed', { orderId: order._id, fareData, dropVerification });
        }

        res.json({ success: true, message: 'Ride completed!', order, fareBreakdown: fareData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/rides/:id — get single order
router.get('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('ownerId', 'name phone profilePhoto rating')
            .populate('driverId', 'name phone profilePhoto rating trainingBadge currentLocation homeLocation');
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
