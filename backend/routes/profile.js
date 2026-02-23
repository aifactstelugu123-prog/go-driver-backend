const express = require('express');
const router = express.Router();
const path = require('path');
const Driver = require('../models/Driver');
const Owner = require('../models/Owner');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { upload, handleUploadError } = require('../middleware/upload');

// ─── Document config ───────────────────────────────────────────
const DRIVER_DOCS = ['photo', 'aadhaarCard', 'panCard', 'drivingLicense', 'tenthCertificate', 'policeVerification', 'rcBook'];
const OWNER_DOCS = ['photo', 'aadhaarCard', 'panCard'];

// ─── DRIVER PROFILE ────────────────────────────────────────────

// GET /api/profile/driver
router.get('/driver', protect, authorize('driver'), async (req, res) => {
    try {
        const d = await Driver.findById(req.user.id).select('-otp -otpExpiry -walletTransactions');
        if (!d) return res.status(404).json({ success: false, message: 'Driver not found.' });
        res.json({ success: true, profile: d });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/profile/driver — update profile info (blocked if profileLocked)
router.put('/driver', protect, authorize('driver'), async (req, res) => {
    try {
        const d = await Driver.findById(req.user.id);
        if (!d) return res.status(404).json({ success: false, message: 'Driver not found.' });
        if (d.profileLocked)
            return res.status(403).json({ success: false, message: 'Profile is locked after admin verification. Contact admin to make changes.' });

        const allowed = ['email', 'address', 'dob', 'aadhaarNumber', 'panNumber', 'licenseNumber'];
        allowed.forEach(f => { if (req.body[f] !== undefined) d[f] = req.body[f]; });
        await d.save();
        res.json({ success: true, message: 'Profile updated.', profile: d });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/profile/driver/upload/:docType — upload one document (200 KB limit)
router.post('/driver/upload/:docType', protect, authorize('driver'), (req, res, next) => {
    const docType = req.params.docType;
    if (!DRIVER_DOCS.includes(docType))
        return res.status(400).json({ success: false, message: `Invalid document type. Valid: ${DRIVER_DOCS.join(', ')}` });
    upload.single(docType)(req, res, (err) => handleUploadError(err, req, res, next));
}, async (req, res) => {
    try {
        const d = await Driver.findById(req.user.id);
        if (!d) return res.status(404).json({ success: false, message: 'Driver not found.' });
        if (d.profileLocked && d.documents?.[req.params.docType]?.status === 'verified')
            return res.status(403).json({ success: false, message: `${req.params.docType} is already verified. Cannot re-upload. Contact admin.` });
        if (!req.file)
            return res.status(400).json({ success: false, message: 'No file uploaded.' });

        const filePath = `/uploads/drivers/${req.file.filename}`;
        d.documents = d.documents || {};
        d.documents[req.params.docType] = { filePath, uploadedAt: new Date(), status: 'pending' };

        // Sync to top-level profilePhoto if docType is photo
        if (req.params.docType === 'photo') {
            d.profilePhoto = filePath;
        }

        await d.save();
        res.json({ success: true, message: 'Document uploaded successfully.', filePath, status: 'pending' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── OWNER PROFILE ─────────────────────────────────────────────

// GET /api/profile/owner
router.get('/owner', protect, authorize('owner'), async (req, res) => {
    try {
        const o = await Owner.findById(req.user.id).select('-otp -otpExpiry -walletTransactions');
        if (!o) return res.status(404).json({ success: false, message: 'Owner not found.' });
        res.json({ success: true, profile: o });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/profile/owner
router.put('/owner', protect, authorize('owner'), async (req, res) => {
    try {
        const o = await Owner.findById(req.user.id);
        if (!o) return res.status(404).json({ success: false, message: 'Owner not found.' });
        if (o.profileLocked)
            return res.status(403).json({ success: false, message: 'Profile is locked after admin verification. Contact admin to make changes.' });

        const allowed = ['email', 'address', 'dob', 'aadhaarNumber', 'panNumber'];
        allowed.forEach(f => { if (req.body[f] !== undefined) o[f] = req.body[f]; });
        await o.save();
        res.json({ success: true, message: 'Profile updated.', profile: o });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/profile/owner/upload/:docType
router.post('/owner/upload/:docType', protect, authorize('owner'), (req, res, next) => {
    const docType = req.params.docType;
    if (!OWNER_DOCS.includes(docType))
        return res.status(400).json({ success: false, message: `Invalid doc type. Valid: ${OWNER_DOCS.join(', ')}` });
    upload.single(docType)(req, res, (err) => handleUploadError(err, req, res, next));
}, async (req, res) => {
    try {
        const o = await Owner.findById(req.user.id);
        if (!o) return res.status(404).json({ success: false, message: 'Owner not found.' });
        if (o.profileLocked && o.documents?.[req.params.docType]?.status === 'verified')
            return res.status(403).json({ success: false, message: `${req.params.docType} is already verified. Contact admin.` });
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

        const filePath = `/uploads/owners/${req.file.filename}`;
        o.documents = o.documents || {};
        o.documents[req.params.docType] = { filePath, uploadedAt: new Date(), status: 'pending' };

        // Sync to top-level profilePhoto if docType is photo
        if (req.params.docType === 'photo') {
            o.profilePhoto = filePath;
        }

        await o.save();
        res.json({ success: true, message: 'Document uploaded.', filePath, status: 'pending' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ADMIN: Verify documents ───────────────────────────────────

// GET /api/profile/admin/pending — all users with pending docs
router.get('/admin/pending', protect, authorize('admin'), async (req, res) => {
    try {
        const drivers = await Driver.find({ 'documents': { $exists: true } })
            .select('name phone aadhaarNumber documents isApproved profileLocked');
        const owners = await Owner.find({ 'documents': { $exists: true } })
            .select('name phone documents profileLocked');
        res.json({ success: true, drivers, owners });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/profile/admin/driver/:id/doc/:docType — verify or reject a doc
router.patch('/admin/driver/:id/doc/:docType', protect, authorize('admin'), async (req, res) => {
    try {
        const { status, lockProfile } = req.body; // status: 'verified' | 'rejected'
        if (!['verified', 'rejected'].includes(status))
            return res.status(400).json({ success: false, message: 'Status must be verified or rejected.' });

        const d = await Driver.findById(req.params.id);
        if (!d) return res.status(404).json({ success: false, message: 'Driver not found.' });

        d.documents[req.params.docType] = { ...d.documents[req.params.docType], status };
        if (lockProfile) d.profileLocked = true;
        await d.save();
        res.json({ success: true, message: `Document ${status}.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/profile/admin/owner/:id/doc/:docType
router.patch('/admin/owner/:id/doc/:docType', protect, authorize('admin'), async (req, res) => {
    try {
        const { status, lockProfile } = req.body;
        if (!['verified', 'rejected'].includes(status))
            return res.status(400).json({ success: false, message: 'Status must be verified or rejected.' });

        const o = await Owner.findById(req.params.id);
        if (!o) return res.status(404).json({ success: false, message: 'Owner not found.' });

        o.documents[req.params.docType] = { ...o.documents[req.params.docType], status };
        if (lockProfile) o.profileLocked = true;
        await o.save();
        res.json({ success: true, message: `Document ${status}.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/profile/admin/driver/:id/lock — lock/unlock profile
router.patch('/admin/driver/:id/lock', protect, authorize('admin'), async (req, res) => {
    try {
        const { locked } = req.body;
        await Driver.findByIdAndUpdate(req.params.id, { profileLocked: locked });
        res.json({ success: true, message: `Driver profile ${locked ? 'locked' : 'unlocked'}.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/profile/admin/owner/:id/lock
router.patch('/admin/owner/:id/lock', protect, authorize('admin'), async (req, res) => {
    try {
        const { locked } = req.body;
        await Owner.findByIdAndUpdate(req.params.id, { profileLocked: locked });
        res.json({ success: true, message: `Owner profile ${locked ? 'locked' : 'unlocked'}.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
