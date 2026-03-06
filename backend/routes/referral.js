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

            // Retroactive assignment for existing drivers
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

            // Retroactive assignment for existing owners
            if (!owner.referralCode) {
                owner.referralCode = 'OWN' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
                const validTill = new Date();
                validTill.setDate(validTill.getDate() + 30);
                owner.freeUsageExpiryDate = validTill;
                await owner.save();
            }

            return res.json({
                success: true,
                role: 'owner',
                referralCode: owner.referralCode,
                freeUsageExpiryDate: owner.freeUsageExpiryDate,
                lastReferralPopupSeen: owner.lastReferralPopupSeen
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

module.exports = router;
