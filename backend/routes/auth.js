const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Owner = require('../models/Owner');
const Driver = require('../models/Driver');
const { adminIpGuard } = require('../middleware/adminIpGuard');
const { protect } = require('../middleware/auth');
const { admin } = require('../config/firebase-admin');
const OTP = require('../models/OTP');
const sendEmail = require('../utils/sendEmail');
const { genCode } = require('../utils/genCode');
const { sendOtp } = require('../services/otpService');

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

// POST /api/auth/phone-login
router.post('/phone-login', async (req, res) => {
    try {
        const { idToken, role, name, referralCode, password } = req.body;
        if (!idToken || !role) return res.status(400).json({ success: false, message: 'ID Token and Role required.' });

        // 1. Verify Firebase token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const phone = decodedToken.phone_number.replace(/^\+91/, ''); 

        // 2. Process based on existence
        const Model = role === 'owner' ? Owner : Driver;
        let user = await Model.findOne({ phone });

        if (!user) {
            if (!name) {
                // Return requireRegistration to trigger frontend form
                return res.json({ success: true, requireRegistration: true, phone, firebaseToken: idToken });
            }

            // REGISTRATION FLOW
            if (role === 'driver') {
                return res.json({ success: true, requireRegistration: true, phone, firebaseToken: idToken });
            }

            // Create Owner
            const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
            user = new Owner({
                name, phone, isVerified: true,
                password: hashedPassword,
                referralCode: genCode('OWN'),
                freeUsageExpiryDate: new Date(new Date().setDate(new Date().getDate() + 30))
            });

            // Referral logic
            if (referralCode) {
                const code = referralCode.trim().toUpperCase();
                const referrer = await Driver.findOne({ referralCode: code }) || await Owner.findOne({ referralCode: code });
                if (referrer) user.referredByCode = code;
            }

            await user.save();
        }

        // 3. Login
        const token = signToken(user._id, role);
        res.json({
            success: true,
            token,
            role,
            user: { id: user._id, name: user.name, phone: user.phone, email: user.email, profilePhoto: user.profilePhoto }
        });
    } catch (err) {
        console.error('[PHONE LOGIN ERROR]', err.message);
        res.status(401).json({ success: false, message: 'Invalid or expired Firebase token.' });
    }
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
    try {
        let { email, phone } = req.body;
        if (!email && !phone) return res.status(400).json({ success: false, message: 'Email or Mobile Number is required' });

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        if (phone) {
            phone = phone.trim();
            console.log(`[OTP ATTEMPT] Phone: ${phone}`);
            await OTP.deleteMany({ phone });
            const otpDoc = new OTP({ phone, otp: otpCode });
            await otpDoc.save();

            const isDriver = await Driver.findOne({ phone });
            const isOwner = await Owner.findOne({ phone });
            const userType = isDriver ? 'REGISTERED_DRIVER' : (isOwner ? 'REGISTERED_OWNER' : 'NEW_USER');

            console.log(`\n-----------------------------------------`);
            console.log(`🔑 OTP GENERATED: ${otpCode}`);
            console.log(`📱 SENDING TO: ${phone} (${userType})`);
            console.log(`-----------------------------------------\n`);

            await sendOtp(phone, otpCode);
            return res.json({ success: true, message: 'OTP sent successfully to ' + phone });
        } else if (email) {
            email = email.trim().toLowerCase();
            console.log(`[OTP ATTEMPT] Email: ${email}`);
            await OTP.deleteMany({ email });
            const otpDoc = new OTP({ email, otp: otpCode });
            await otpDoc.save();

            const isDriver = await Driver.findOne({ email });
            const isOwner = await Owner.findOne({ email });
            const userType = isDriver ? 'REGISTERED_DRIVER' : (isOwner ? 'REGISTERED_OWNER' : 'NEW_USER');

            console.log(`\n-----------------------------------------`);
            console.log(`🔑 OTP GENERATED: ${otpCode}`);
            console.log(`📧 SENDING TO: ${email} (${userType})`);
            console.log(`-----------------------------------------\n`);

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

            try {
                await sendEmail({ email, subject: 'Your DaaS Platform Verification Code', message });
                res.json({ success: true, message: 'OTP sent successfully to ' + email });
            } catch (emailErr) {
                console.error('[EMAIL FAILURE]', emailErr.message);
                res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again later.' });
            }
        }
    } catch (err) {
        console.error('[SEND OTP ERROR]', err);
        res.status(500).json({ success: false, message: `Error: ${err.message || 'OTP delivery failed'}` });
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        let { email, phone, otp, role, name, referralCode, password } = req.body;
        if ((!email && !phone) || !otp || !role) return res.status(400).json({ success: false, message: 'Email/Phone, OTP, and Role are required' });
        
        // 1. Validate OTP
        let otpRecord = null;
        if (phone) {
            phone = phone.trim();
            otpRecord = await OTP.findOne({ phone });
        } else if (email) {
            email = email.trim().toLowerCase();
            otpRecord = await OTP.findOne({ email });
        }

        if (!otpRecord) return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new one.' });
        if (otpRecord.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP code.' });

        // 2. Process based on Role
        if (role === 'admin') {
            const adminEmails = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.split(',').map(e => e.trim().toLowerCase()) : [];
            if (email && adminEmails.includes(email)) {
                await OTP.deleteOne({ _id: otpRecord._id }); // Consume OTP
                const token = signToken('admin', 'admin');
                return res.json({ success: true, token, role: 'admin', user: { id: 'admin', email } });
            }
            return res.status(403).json({ success: false, message: 'Unauthorized Admin Email.' });
        }

        let user;
        const Model = role === 'owner' ? Owner : Driver;

        // Try to find existing user 
        if (phone) {
            user = await Model.findOne({ phone });
        } else if (email) {
            user = await Model.findOne({ email });
        }

        if (!user) {
            // REGISTRATION FLOW
            if (role === 'driver') {
                // Drivers MUST go through the multipart /api/driver/register flow to upload documents
                return res.json({ success: true, requireRegistration: true, email, phone });
            }

            if (!name) { // For owner, name is required
                // Do NOT delete OTP yet, they need to fill out their details in the frontend form
                return res.json({ success: true, requireRegistration: true, email, phone });
            }

            // Ensure unique phone for Owner
            const existingPhone = await Model.findOne({ phone });
            if (existingPhone) return res.status(400).json({ success: false, message: 'Phone number already registered to another account.' });

            if (role === 'owner') {
                // Validate referral code (cross-table, prevent self-referral)
                let referredByCode = null;
                if (referralCode) {
                    const code = referralCode.trim().toUpperCase();
                    // Find referrer in either table, ensuring it's not the registering email or phone
                    const query = email ? { referralCode: code, email: { $ne: email } } : { referralCode: code, phone: { $ne: phone } };
                    const driverRef = await Driver.findOne(query);
                    const ownerRef = !driverRef ? await Owner.findOne(query) : null;
                    if (driverRef || ownerRef) {
                        referredByCode = code; // Valid referral code
                    }
                }

                const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
                user = new Owner({
                    name, phone, isVerified: true,
                    ...(email ? { email } : {}),
                    ...(hashedPassword ? { password: hashedPassword } : {}),
                    referralCode: genCode('OWN'),
                    freeUsageExpiryDate: new Date(new Date().setDate(new Date().getDate() + 30)),
                    ...(referredByCode ? { referredByCode } : {}),
                });
                await user.save();
            }
        } else {
             // If user exists and password is provided during login/verification, we could update it? No, let's keep separate endpoint or just verify OTP
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

// POST /api/auth/login-password
router.post('/login-password', async (req, res) => {
    try {
        const { phone, password, role } = req.body;
        if (!phone || !password || !role) return res.status(400).json({ success: false, message: 'Phone, Password, and Role are required.' });

        const Model = role === 'owner' ? Owner : Driver;
        const user = await Model.findOne({ phone: phone.trim() });

        if (!user) return res.status(400).json({ success: false, message: 'User not found with this mobile number.' });
        if (!user.password) return res.status(400).json({ success: false, message: 'Password is not set for this account. Please use OTP to login and set a password.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials.' });

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
                isApproved: user.isApproved,
                profilePhoto: user.profilePhoto || null
            }
        });
    } catch (err) {
        console.error('[LOGIN ERROR]', err);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// PUT /api/auth/set-password
router.put('/set-password', protect, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });

        const { role, id } = req.user;
        const Model = role === 'owner' ? Owner : Driver;
        
        const hashedPassword = await bcrypt.hash(password, 10);
        await Model.findByIdAndUpdate(id, { password: hashedPassword });

        res.json({ success: true, message: 'Password set successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error setting password.' });
    }
});

module.exports = router;
