const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const Owner = require('../models/Owner');
const { protect } = require('../middleware/auth');

// GET /api/referral/status
router.get('/status', protect, async (req, res) => {
    try {
        const { role, id } = req.user;

        if (role === 'driver') {
            let driver = await Driver.findById(id);
            if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

            if (!driver.referralCode) {
                driver.referralCode = 'DRV' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
                const validTill = new Date();
                validTill.setMonth(validTill.getMonth() + 3);
                driver.referralValidTill = validTill;
                await driver.save();
            }

            return res.json({
                success: true,
                role: 'driver',
                referralCode: driver.referralCode,
                referralCount: driver.referralCount || 0,
                referralValidTill: driver.referralValidTill,
                currentRewardSlab: driver.currentRewardSlab || null,
                freeRidesExpiryDate: driver.freeRidesExpiryDate || null
            });
        }

        if (role === 'owner') {
            let owner = await Owner.findById(id);
            if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

            if (!owner.referralCode) {
                owner.referralCode = 'OWN' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
                const validTill = new Date();
                validTill.setDate(validTill.getDate() + 30);
                owner.freeUsageExpiryDate = validTill;
                await owner.save();
            }

            // Count how many people joined using this owner's code
            const [referredDriverCount, referredOwnerCount] = await Promise.all([
                Driver.countDocuments({ referredByCode: owner.referralCode }),
                Owner.countDocuments({ referredByCode: owner.referralCode }),
            ]);

            return res.json({
                success: true,
                role: 'owner',
                referralCode: owner.referralCode,
                freeUsageExpiryDate: owner.freeUsageExpiryDate,
                lastReferralPopupSeen: owner.lastReferralPopupSeen,
                referralCount: referredDriverCount + referredOwnerCount,
            });
        }

        return res.status(400).json({ success: false, message: 'Invalid role' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/referral/owner/popup-seen
router.put('/owner/popup-seen', protect, async (req, res) => {
    try {
        if (req.user.role !== 'owner') return res.status(403).json({ success: false, message: 'Only owners can record popup views' });
        await Owner.findByIdAndUpdate(req.user.id, { lastReferralPopupSeen: new Date() });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/referral/admin/list
// Returns: who referred whom (drivers + owners that joined via referral code)
// and who are the top referrers among drivers and owners
router.get('/admin/list', protect, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admins only' });

        // Drivers who joined via someone's referral code
        const referredDrivers = await Driver.find({ referredByCode: { $exists: true, $nin: [null, ''] } })
            .select('name phone email referralCode referredByCode referralCount createdAt isApproved profilePhoto')
            .sort({ createdAt: -1 });

        // Owners who joined via someone's referral code
        const referredOwners = await Owner.find({ referredByCode: { $exists: true, $nin: [null, ''] } })
            .select('name phone email referralCode referredByCode freeUsageExpiryDate createdAt profilePhoto')
            .sort({ createdAt: -1 });

        // Driver referrers: drivers who have referralCount > 0
        const activeReferrerDrivers = await Driver.find({ referralCount: { $gt: 0 } })
            .select('name phone referralCode referralCount currentRewardSlab freeRidesExpiryDate createdAt profilePhoto')
            .sort({ referralCount: -1 });

        // Owner referrers: count how many joined using each owner's code
        const allOwners = await Owner.find({ referralCode: { $exists: true, $nin: [null, ''] } })
            .select('name phone referralCode freeUsageExpiryDate createdAt profilePhoto')
            .lean();

        const ownerWithCounts = await Promise.all(
            allOwners.map(async (o) => {
                const driversReferred = await Driver.countDocuments({ referredByCode: o.referralCode });
                const ownersReferred = await Owner.countDocuments({ referredByCode: o.referralCode });
                return { ...o, referralCount: driversReferred + ownersReferred };
            })
        );
        const activeReferrerOwners = ownerWithCounts
            .filter(o => o.referralCount > 0)
            .sort((a, b) => b.referralCount - a.referralCount);

        res.json({
            success: true,
            referredDrivers,
            referredOwners,
            activeReferrerDrivers,
            activeReferrerOwners,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/referral/owner/joined — list of people who used this owner's referral code
router.get('/owner/joined', protect, async (req, res) => {
    try {
        if (req.user.role !== 'owner') return res.status(403).json({ success: false, message: 'Owners only' });
        const owner = await Owner.findById(req.user.id).select('referralCode');
        if (!owner?.referralCode) return res.json({ success: true, drivers: [], owners: [] });

        const [drivers, owners] = await Promise.all([
            Driver.find({ referredByCode: owner.referralCode }).select('name phone email createdAt').sort({ createdAt: -1 }),
            Owner.find({ referredByCode: owner.referralCode, _id: { $ne: owner._id } }).select('name phone email createdAt').sort({ createdAt: -1 }),
        ]);

        res.json({ success: true, drivers, owners });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/referral/driver/joined — list of drivers who joined using this driver's code
router.get('/driver/joined', protect, async (req, res) => {
    try {
        if (req.user.role !== 'driver') return res.status(403).json({ success: false, message: 'Drivers only' });
        const driver = await Driver.findById(req.user.id).select('referralCode');
        if (!driver?.referralCode) return res.json({ success: true, drivers: [] });

        const drivers = await Driver.find({ referredByCode: driver.referralCode })
            .select('name phone email createdAt isApproved')
            .sort({ createdAt: -1 });

        res.json({ success: true, drivers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
