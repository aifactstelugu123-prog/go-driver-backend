const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner');
const Driver = require('../models/Driver');
const { adminIpGuard } = require('../middleware/adminIpGuard');
const { protect } = require('../middleware/auth');
const { admin } = require('../config/firebase-admin');

const signToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '365d' });

// ─────────────────────────────────────────────
// TERMS AND CONDITIONS
// ─────────────────────────────────────────────

// PUT /api/auth/accept-tnc
router.put('/accept-tnc', protect, async (req, res) => {
    try {
        const { role, id } = req.user;
        if (role === 'owner') {
            await Owner.findByIdAndUpdate(id, { acceptedTnC: true });
        } else if (role === 'driver') {
            await Driver.findByIdAndUpdate(id, { acceptedTnC: true });
        }
        res.json({ success: true, message: 'Terms and Conditions accepted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────
// OWNER AUTH
// ─────────────────────────────────────────────

// POST /api/auth/owner/google-login
router.post('/owner/google-login', async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ success: false, message: 'Google token required.' });

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const email = decodedToken.email;
        if (!email) return res.status(400).json({ success: false, message: 'Google token must contain an email.' });

        const owner = await Owner.findOne({ email });
        if (!owner) {
            // New user, needs phone number
            return res.json({ success: true, requirePhone: true, email, name: decodedToken.name, photo: decodedToken.picture });
        }

        const token = signToken(owner._id, 'owner');
        res.json({ success: true, token, role: 'owner', user: { id: owner._id, name: owner.name, phone: owner.phone, email: owner.email, profilePhoto: owner.profilePhoto } });
    } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid or expired Google token.' });
    }
});

// POST /api/auth/owner/google-register
router.post('/owner/google-register', async (req, res) => {
    try {
        const { idToken, phone } = req.body;
        if (!idToken || !phone) return res.status(400).json({ success: false, message: 'Google token and phone number are required.' });

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const email = decodedToken.email;

        // Ensure unique phone
        const existingPhone = await Owner.findOne({ phone });
        if (existingPhone) return res.status(400).json({ success: false, message: 'Phone number already registered to another account.' });

        const owner = new Owner({
            name: decodedToken.name || 'Owner',
            email,
            phone,
            isVerified: true,
            profilePhoto: decodedToken.picture
        });
        await owner.save();

        const token = signToken(owner._id, 'owner');
        res.json({ success: true, token, role: 'owner', user: { id: owner._id, name: owner.name, phone: owner.phone, email: owner.email, profilePhoto: owner.profilePhoto } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─────────────────────────────────────────────
// DRIVER AUTH
// ─────────────────────────────────────────────

// POST /api/auth/driver/google-login
router.post('/driver/google-login', async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ success: false, message: 'Google token required.' });

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const email = decodedToken.email;
        if (!email) return res.status(400).json({ success: false, message: 'Google token must contain an email.' });

        const driver = await Driver.findOne({ email });
        if (!driver) {
            // Driver needs full registration
            return res.json({ success: true, requireRegistration: true, email, name: decodedToken.name, photo: decodedToken.picture });
        }

        const token = signToken(driver._id, 'driver');
        res.json({
            success: true, token, role: 'driver',
            user: { id: driver._id, name: driver.name, phone: driver.phone, email: driver.email, isApproved: driver.isApproved, profilePhoto: driver.profilePhoto }
        });
    } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid or expired Google token.' });
    }
});

// ─────────────────────────────────────────────
// ADMIN AUTH
// ─────────────────────────────────────────────

// POST /api/auth/admin/google-login
router.post('/admin/google-login', async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ success: false, message: 'Google token required.' });

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const email = decodedToken.email;
        console.log(`[ADMIN LOGIN ATTEMPT] Email: ${email}`);

        const adminEmails = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.split(',').map(e => e.trim().toLowerCase()) : [];
        console.log(`[ADMIN WHITELIST] ${adminEmails.join(', ')}`);

        // Match with env admin email list
        if (email && adminEmails.includes(email.toLowerCase())) {
            console.log(`[ADMIN LOGIN SUCCESS] ${email}`);
            const token = signToken('admin', 'admin');
            return res.json({ success: true, token, role: 'admin', user: { id: 'admin', email } });
        }
        console.warn(`[ADMIN LOGIN FAILED] Unauthorized Email: ${email}`);
        res.status(401).json({ success: false, message: 'Unauthorized Admin.' });
    } catch (err) {
        console.error(`[ADMIN LOGIN ERROR] ${err.message}`);
        res.status(401).json({ success: false, message: 'Invalid or expired Google token.' });
    }
});

module.exports = router;
