const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner');
const Driver = require('../models/Driver');
const { adminIpGuard } = require('../middleware/adminIpGuard');
const { protect } = require('../middleware/auth');
const { admin } = require('../config/firebase-admin');
const OTP = require('../models/OTP');
const sendEmail = require('../utils/sendEmail');
const { genCode } = require('../utils/genCode');

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
            profilePhoto: decodedToken.picture,
            referralCode: genCode('OWN'),
            freeUsageExpiryDate: new Date(new Date().setDate(new Date().getDate() + 30))
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

// ─────────────────────────────────────────────
// EMAIL OTP AUTHENTICATION (PASSWORDLESS)
// ─────────────────────────────────────────────

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
    try {
        let { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
        email = email.trim().toLowerCase();

        // 1. Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // 2. Remove any existing OTP for this email
        await OTP.deleteMany({ email });

        // 3. Save new OTP to database
        const otpDoc = new OTP({ email, otp: otpCode });
        await otpDoc.save();

        // 4. Send Email
        const message = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ccc; border-radius: 8px; max-width: 500px; margin: auto;">
                <h2 style="color: #00d4aa; text-align: center;">DaaS Platform</h2>
                <p>Hello,</p>
                <p>Your verification code for accessing the DaaS platform is:</p>
                <h1 style="text-align: center; letter-spacing: 5px; color: #333;">${otpCode}</h1>
                <p>This code will expire in 5 minutes. Do not share this code with anyone.</p>
                <br />
                <p>Regards,<br>DaaS Platform Team</p>
            </div>
        `;

        await sendEmail({
            email,
            subject: 'Your DaaS Platform Verification Code',
            message
        });

        res.json({ success: true, message: 'OTP sent successfully to ' + email });
    } catch (err) {
        console.error('[SEND OTP ERROR]', err);
        res.status(500).json({ success: false, message: 'Error sending OTP. Please try again.' });
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        let { email, otp, role, name, phone, referralCode } = req.body;
        if (!email || !otp || !role) return res.status(400).json({ success: false, message: 'Email, OTP, and Role are required' });
        email = email.trim().toLowerCase();

        // 1. Validate OTP
        const otpRecord = await OTP.findOne({ email });
        if (!otpRecord) return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new one.' });
        if (otpRecord.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP code.' });

        // 2. Process based on Role
        if (role === 'admin') {
            const adminEmails = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.split(',').map(e => e.trim().toLowerCase()) : [];
            if (adminEmails.includes(email)) {
                await OTP.deleteOne({ _id: otpRecord._id }); // Consume OTP
                const token = signToken('admin', 'admin');
                return res.json({ success: true, token, role: 'admin', user: { id: 'admin', email } });
            }
            return res.status(403).json({ success: false, message: 'Unauthorized Admin Email.' });
        }

        let user;
        const Model = role === 'owner' ? Owner : Driver;

        // Try to find existing user
        user = await Model.findOne({ email });

        if (!user) {
            // REGISTRATION FLOW
            if (role === 'driver') {
                // Drivers MUST go through the multipart /api/driver/register flow to upload documents
                return res.json({ success: true, requireRegistration: true, email });
            }

            if (!name || !phone) {
                // Do NOT delete OTP yet, they need to fill out their details in the frontend form
                return res.json({ success: true, requireRegistration: true, email });
            }

            // Ensure unique phone for Owner
            const existingPhone = await Model.findOne({ phone });
            if (existingPhone) return res.status(400).json({ success: false, message: 'Phone number already registered to another account.' });

            if (role === 'owner') {
                // Validate referral code (cross-table, prevent self-referral)
                let referredByCode = null;
                if (referralCode) {
                    const code = referralCode.trim().toUpperCase();
                    // Find referrer in either table, ensuring it's not the registering email
                    const driverRef = await Driver.findOne({ referralCode: code });
                    const ownerRef = !driverRef ? await Owner.findOne({ referralCode: code, email: { $ne: email } }) : null;
                    if (driverRef || ownerRef) {
                        referredByCode = code; // Valid referral code
                    }
                }

                user = new Owner({
                    name, email, phone, isVerified: true,
                    referralCode: genCode('OWN'),
                    freeUsageExpiryDate: new Date(new Date().setDate(new Date().getDate() + 30)),
                    ...(referredByCode ? { referredByCode } : {}),
                });
                await user.save();
            }
        }

        // LOGIN / COMPLETED REGISTRATION FLOW
        await OTP.deleteOne({ _id: otpRecord._id }); // Consume OTP since auth succeeded
        const token = signToken(user._id, role);
        res.json({
            success: true,
            token,
            role,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                isApproved: user.isApproved, // Usually only driver has this, harmless for owner
                profilePhoto: user.profilePhoto || null
            }
        });

    } catch (err) {
        console.error('[VERIFY OTP ERROR]', err);
        res.status(500).json({ success: false, message: 'Server error verifying OTP.' });
    }
});

module.exports = router;
