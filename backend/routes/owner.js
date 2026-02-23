const express = require('express');
const router = express.Router();
const Owner = require('../models/Owner');
const Vehicle = require('../models/Vehicle');
const Order = require('../models/Order');
const Driver = require('../models/Driver');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { getHourlyRate } = require('../services/fareService');
const { generateOtp, getOtpExpiry } = require('../services/otpService');
const { HOURLY_RATES } = require('../config/constants');

// ─── OWNER PROFILE ────────────────────────────────────────────

// GET /api/owner/profile
router.get('/profile', protect, authorize('owner'), async (req, res) => {
    try {
        const owner = await Owner.findById(req.user.id).select('-otp -otpExpiry');
        res.json({ success: true, owner });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── VEHICLES ─────────────────────────────────────────────────

// GET /api/owner/vehicles
router.get('/vehicles', protect, authorize('owner'), async (req, res) => {
    try {
        const vehicles = await Vehicle.find({ ownerId: req.user.id, isActive: true });
        res.json({ success: true, vehicles });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/owner/vehicles
router.post('/vehicles', protect, authorize('owner'), async (req, res) => {
    try {
        const { vehicleNumber, vehicleType, transmissionType, make, model, variant, year, color, fuelType } = req.body;
        if (!vehicleNumber || !vehicleType || !transmissionType)
            return res.status(400).json({ success: false, message: 'Vehicle number, type, and transmission are required.' });

        const exists = await Vehicle.findOne({ vehicleNumber: vehicleNumber.toUpperCase() });
        if (exists) return res.status(409).json({ success: false, message: 'Vehicle already registered.' });

        const vehicle = await Vehicle.create({
            ownerId: req.user.id,
            vehicleNumber: vehicleNumber.toUpperCase(),
            vehicleType, transmissionType,
            make, model, variant,
            year: year ? parseInt(year) : undefined,
            color,
            fuelType: fuelType || '',
        });
        res.status(201).json({ success: true, vehicle });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/owner/vehicles/:id
router.put('/vehicles/:id', protect, authorize('owner'), async (req, res) => {
    try {
        const vehicle = await Vehicle.findOneAndUpdate(
            { _id: req.params.id, ownerId: req.user.id },
            req.body,
            { new: true, runValidators: true }
        );
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
        res.json({ success: true, vehicle });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/owner/vehicles/:id
router.delete('/vehicles/:id', protect, authorize('owner'), async (req, res) => {
    try {
        await Vehicle.findOneAndUpdate({ _id: req.params.id, ownerId: req.user.id }, { isActive: false });
        res.json({ success: true, message: 'Vehicle removed.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/owner/hourly-rates — show rates table
router.get('/hourly-rates', (req, res) => {
    res.json({ success: true, rates: HOURLY_RATES });
});

// ─── RIDES ────────────────────────────────────────────────────

// POST /api/owner/rides — create ride
router.post('/rides', protect, authorize('owner'), async (req, res) => {
    try {
        const { vehicleType, vehicleId, pickupLat, pickupLng, pickupAddress, dropLat, dropLng, dropAddress, scheduledAt, isRoundTrip } = req.body;

        const owner = await Owner.findById(req.user.id);
        if (!owner || (owner.walletBalance <= 0)) {
            return res.status(403).json({ success: false, message: 'Please load wallet to create ride. Minimum balance > ₹0 required.' });
        }

        if (!vehicleType || !pickupLat || !pickupLng || !dropLat || !dropLng || !scheduledAt)
            return res.status(400).json({ success: false, message: 'All ride fields are required.' });

        const hourlyRate = getHourlyRate(vehicleType);

        const order = await Order.create({
            ownerId: req.user.id,
            vehicleId,
            vehicleType,
            pickupLocation: { lat: Number(pickupLat), lng: Number(pickupLng), address: pickupAddress },
            dropLocation: { lat: Number(dropLat), lng: Number(dropLng), address: dropAddress },
            scheduledAt: new Date(scheduledAt),
            hourlyRate,
            status: 'Searching',
            isRoundTrip: !!isRoundTrip,
        });

        // Trigger matching engine via Socket.io (handled in socket config)
        const io = req.app.get('io');
        const driverSocket = req.app.get('driverSocket'); // Map: driverId -> socketId
        if (io) {
            // Find busy drivers (those with active/accepted rides)
            const activeOrders = await Order.find({ status: { $in: ['Accepted', 'Active'] } });
            const busyDriverIds = new Set(activeOrders.map(o => o.driverId.toString()));

            // Find eligible drivers
            const { findEligibleDrivers } = require('../services/matchingEngine');
            const allDrivers = await Driver.find({ isApproved: true, isOnline: true });
            const eligible = findEligibleDrivers(allDrivers, { lat: Number(pickupLat), lng: Number(pickupLng) }, vehicleType, 10, busyDriverIds);

            eligible.forEach((driver) => {
                const socketId = driverSocket && driverSocket.get(driver._id.toString());
                if (socketId) {
                    io.to(socketId).emit('ride:new_assignment', {
                        orderId: order._id,
                        vehicleType,
                        pickupAddress,
                        dropAddress,
                        pickupLocation: { lat: Number(pickupLat), lng: Number(pickupLng) },
                        dropLocation: { lat: Number(dropLat), lng: Number(dropLng) },
                        hourlyRate,
                        fare: hourlyRate, // for compatibility
                        scheduledDate: scheduledAt,
                        ownerName: req.user.name || 'Owner',
                        isRoundTrip: !!isRoundTrip,
                    });
                }
            });

            // Auto-expand search radius after 30 seconds if no acceptance
            setTimeout(async () => {
                const current = await Order.findById(order._id);
                if (current && current.status === 'Searching') {
                    const activeOrders = await Order.find({ status: { $in: ['Accepted', 'Active'] } });
                    const busyDriverIds = new Set(activeOrders.map(o => o.driverId?.toString()).filter(Boolean));

                    const freshDrivers = await Driver.find({ isApproved: true, isOnline: true });
                    const expanded = findEligibleDrivers(freshDrivers, { lat: Number(pickupLat), lng: Number(pickupLng) }, vehicleType, 20, busyDriverIds);

                    expanded.forEach((driver) => {
                        const socketId = driverSocket && driverSocket.get(driver._id.toString());
                        if (socketId) {
                            io.to(socketId).emit('ride:new_assignment', {
                                orderId: order._id, vehicleType, pickupAddress, dropAddress,
                                pickupLocation: { lat: Number(pickupLat), lng: Number(pickupLng) },
                                dropLocation: { lat: Number(dropLat), lng: Number(dropLng) },
                                hourlyRate, fare: hourlyRate, scheduledDate: scheduledAt,
                                expanded: true, ownerName: req.user.name || 'Owner',
                            });
                        }
                    });
                }
            }, 30000);
        }

        res.status(201).json({ success: true, order, hourlyRate, message: 'Ride created. Searching for drivers...' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/owner/rides — ride history
router.get('/rides', protect, authorize('owner'), async (req, res) => {
    try {
        const orders = await Order.find({ ownerId: req.user.id })
            .populate('driverId', 'name phone profilePhoto')
            .sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/owner/rides/:id
router.get('/rides/:id', protect, authorize('owner'), async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, ownerId: req.user.id })
            .populate('driverId', 'name phone profilePhoto currentLocation vehicleSkills trainingBadge');
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/owner/rides/:id/cancel
router.post('/rides/:id/cancel', protect, authorize('owner'), async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, ownerId: req.user.id });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
        if (['Completed', 'Cancelled'].includes(order.status))
            return res.status(400).json({ success: false, message: 'Cannot cancel this order.' });

        order.status = 'Cancelled';
        order.cancelReason = req.body.reason || 'Cancelled by owner';
        order.cancelledBy = 'owner';
        await order.save();

        res.json({ success: true, message: 'Ride cancelled.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/owner/rto-lookup/:regNumber — auto-fetch vehicle details from RTO
router.get('/rto-lookup/:regNumber', protect, authorize('owner'), async (req, res) => {
    try {
        const reg = req.params.regNumber.toUpperCase().replace(/\s/g, '');
        const apiKey = process.env.VEHICLE_INFO_API_KEY;

        if (!apiKey) {
            // Fallback: parse what we can from the reg number format
            // e.g. MH12DE1433 → State: Maharashtra, RTO: Pune
            const stateCode = reg.slice(0, 2);
            const stateMap = {
                MH: 'Maharashtra', DL: 'Delhi', KA: 'Karnataka', TN: 'Tamil Nadu',
                TS: 'Telangana', AP: 'Andhra Pradesh', GJ: 'Gujarat', RJ: 'Rajasthan',
                UP: 'Uttar Pradesh', WB: 'West Bengal', KL: 'Kerala', MP: 'Madhya Pradesh',
                HR: 'Haryana', PB: 'Punjab', BR: 'Bihar', OR: 'Odisha', AS: 'Assam',
                JH: 'Jharkhand', CG: 'Chhattisgarh', UK: 'Uttarakhand',
            };
            return res.json({
                success: true,
                partial: true,
                vehicleNumber: reg,
                state: stateMap[stateCode] || stateCode,
                message: 'Set VEHICLE_INFO_API_KEY in .env for full RTO details.',
            });
        }

        // Call vehicleinfo.in API
        const response = await require('axios').get(
            `https://api.vehicleinfo.in/api/v1/rc-details`,
            {
                params: { reg_no: reg },
                headers: { 'x-api-key': apiKey },
                timeout: 8000,
            }
        );

        const d = response.data?.result || response.data;
        res.json({
            success: true,
            vehicleNumber: reg,
            make: d?.maker_desc || d?.maker || '',
            model: d?.model || d?.vehicle_model || '',
            year: d?.mfg_month_yr?.split('/')?.[1] || d?.manufacturing_year || '',
            color: d?.color || d?.vehicle_colour || '',
            fuelType: d?.fuel_desc || d?.fuel || '',
            ownerName: d?.owner_name || '',
            vehicleClass: d?.vehicle_class_desc || '',
            registrationDate: d?.reg_date || d?.registration_date || '',
            insuranceExpiry: d?.insurance_upto || '',
            pucExpiry: d?.pucc_upto || '',
            financier: d?.financier || '',
            raw: d,
        });
    } catch (err) {
        if (err.response?.status === 404) {
            return res.status(404).json({ success: false, message: 'Vehicle not found in RTO records.' });
        }
        res.status(500).json({ success: false, message: 'RTO lookup failed. Try manually.' });
    }
});

module.exports = router;
