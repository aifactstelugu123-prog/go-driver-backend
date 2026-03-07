const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Driver = require('../models/Driver');
const Subscription = require('../models/Subscription');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { getOtpExpiry } = require('../services/otpService'); // Kept for ride OTPs if needed
const { SUBSCRIPTION_PLANS } = require('../config/constants');
const { admin } = require('../config/firebase-admin');

// Simple multer for driver registration docs
const regUploadDir = path.join(__dirname, '../uploads/drivers');
if (!fs.existsSync(regUploadDir)) fs.mkdirSync(regUploadDir, { recursive: true });
const regUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, regUploadDir),
        filename: (req, file, cb) => cb(null, `${Date.now()}_${file.fieldname}${path.extname(file.originalname)}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for registration
});

// ─── DRIVER REGISTRATION ─────────────────────────────────────

// POST /api/driver/register
router.post(
    '/register',
    regUpload.fields([
        { name: 'drivingLicense', maxCount: 1 },
        { name: 'tenthCertificate', maxCount: 1 },
        { name: 'photo', maxCount: 1 },
    ]),
    async (req, res) => {
        try {
            const { name, phone, aadhaarNumber, vehicleSkills, homeLat, homeLng, googleToken, email, otp } = req.body;

            if (!name || !phone || !aadhaarNumber)
                return res.status(400).json({ success: false, message: 'Name, phone, and Aadhaar number are required.' });

            let email = '';
            // 1. Verify the Google token OR Email+OTP
            if (googleToken && googleToken !== 'null') {
                try {
                    const decodedToken = await admin.auth().verifyIdToken(googleToken);
                    email = decodedToken.email;
                    if (!email) return res.status(400).json({ success: false, message: 'Google token must contain an email address.' });
                } catch (fbError) {
                    return res.status(401).json({ success: false, message: 'Invalid or expired Google authentication token.' });
                }
            } else if (req.body.email && req.body.otp) {
                const OTP = require('../models/OTP');
                const otpRecord = await OTP.findOne({ email: req.body.email.trim().toLowerCase() });
                if (!otpRecord || otpRecord.otp !== req.body.otp) {
                    return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
                }
                email = req.body.email.trim().toLowerCase();
                // We'll delete the OTP later right before saving the driver
            } else {
                return res.status(400).json({ success: false, message: 'Google Authentication or Email OTP is required.' });
            }

            const existing = await Driver.findOne({ $or: [{ phone }, { aadhaarNumber }] });
            if (existing)
                return res.status(409).json({ success: false, message: 'Driver with this phone or Aadhaar number already exists.' });

            const skills = Array.isArray(vehicleSkills) ? vehicleSkills : JSON.parse(vehicleSkills || '[]');

            // Build 3 months validity for referral program
            const referralValidTill = new Date();
            referralValidTill.setMonth(referralValidTill.getMonth() + 3);

            let referredById = null;
            if (req.body.referralCode) {
                const referrer = await Driver.findOne({ referralCode: req.body.referralCode.toUpperCase() });
                if (referrer && referrer.referralValidTill && referrer.referralValidTill > new Date() && referrer.referralCount < 10) {
                    referredById = referrer._id;
                    // Note: We don't increment referrer count yet until the new driver is approved by admin (per the logic, verify first)
                    // Wait, the logic says "Completes login + account verified".
                    // Let's just link it here. We will increment it when the admin approves the driver.
                }
            }

            const driver = new Driver({
                name,
                phone,
                email, // Email from Google Auth
                aadhaarNumber,
                vehicleSkills: skills,
                homeLocation: { lat: Number(homeLat), lng: Number(homeLng) },
                documents: {
                    photo: { filePath: req.files?.photo?.[0] ? `/uploads/drivers/${req.files.photo[0].filename}` : '', uploadedAt: new Date() },
                    drivingLicense: { filePath: req.files?.drivingLicense?.[0] ? `/uploads/drivers/${req.files.drivingLicense[0].filename}` : '', uploadedAt: new Date() },
                    tenthCertificate: { filePath: req.files?.tenthCertificate?.[0] ? `/uploads/drivers/${req.files.tenthCertificate[0].filename}` : '', uploadedAt: new Date() },
                },
                profilePhoto: req.files?.photo?.[0] ? `/uploads/drivers/${req.files.photo[0].filename}` : '',
                isVerified: true, // Authenticated via Google
                referralCode: `DRV${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`,
                referralValidTill,
                referredBy: referredById
            });

            await driver.save();

            // Cleanup OTP if used
            if (!googleToken || googleToken === 'null') {
                const OTP = require('../models/OTP');
                await OTP.deleteOne({ email });
            }

            res.status(201).json({ success: true, message: 'Registration submitted successfully. Await admin approval.' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ─── DRIVER PROFILE ──────────────────────────────────────────

// GET /api/driver/profile
router.get('/profile', protect, authorize('driver'), async (req, res) => {
    try {
        const driver = await Driver.findById(req.user.id).select('-otp -otpExpiry').populate('currentSubscriptionId');
        res.json({ success: true, driver });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/driver/online — validation before going online
router.put('/online', protect, authorize('driver'), async (req, res) => {
    try {
        const driver = await Driver.findById(req.user.id);
        if (!driver.isApproved) return res.status(403).json({ success: false, message: 'Your account is not approved by admin yet.' });
        if (driver.referralCount < 1) return res.status(403).json({ success: false, message: 'Refer at least 1 member to start accepting rides.' });

        const now = new Date();
        const hasActiveSub = driver.subscriptionExpiry && driver.subscriptionExpiry > now;
        const hasRidesLeft = driver.ridesAssigned < driver.rideLimit;

        if (!hasActiveSub || !hasRidesLeft) {
            return res.status(403).json({
                success: false,
                message: 'Active subscription required to go online. Please buy a plan or claim free trial.'
            });
        }

        driver.isOnline = true;
        await driver.save();
        res.json({ success: true, message: 'You are now online.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/driver/location  — update live GPS location (status persistence)
router.put('/location', protect, authorize('driver'), async (req, res) => {
    try {
        const { lat, lng } = req.body;
        // Persistence: don't force online if they were already offline
        await Driver.findByIdAndUpdate(req.user.id, {
            currentLocation: { lat, lng, updatedAt: new Date() },
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/driver/offline
router.put('/offline', protect, authorize('driver'), async (req, res) => {
    try {
        await Driver.findByIdAndUpdate(req.user.id, { isOnline: false });
        res.json({ success: true, message: 'You are now offline.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── SUBSCRIPTION STATUS ─────────────────────────────────────

// GET /api/driver/subscription-status
router.get('/subscription-status', protect, authorize('driver'), async (req, res) => {
    try {
        const driver = await Driver.findById(req.user.id);
        const sub = await Subscription.findById(driver.currentSubscriptionId);
        const now = new Date();
        const isActive = sub && sub.isActive && sub.ridesAssigned < sub.rideLimit && sub.expiryDate > now;

        res.json({
            success: true,
            hasSubscription: !!sub,
            isActive,
            plan: sub?.plan,
            planName: sub?.planName,
            ridesAssigned: driver.ridesAssigned,
            rideLimit: driver.rideLimit,
            expiryDate: driver.subscriptionExpiry,
            hasUsedFreeTrial: driver.hasUsedFreeTrial,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── FREE TRIAL ───────────────────────────────────────────────

// POST /api/driver/claim-free-trial
router.post('/claim-free-trial', protect, authorize('driver'), async (req, res) => {
    try {
        const driver = await Driver.findById(req.user.id);
        if (!driver.isApproved) return res.status(403).json({ success: false, message: 'Driver not approved yet.' });
        if (driver.hasUsedFreeTrial) return res.status(400).json({ success: false, message: 'Free trial already used for this Aadhaar/phone.' });

        const plan = SUBSCRIPTION_PLANS.free_trial;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + plan.days);

        const sub = await Subscription.create({
            driverId: driver._id,
            plan: 'free_trial',
            planName: plan.name,
            price: 0,
            rideLimit: plan.rideLimit,
            ridesAssigned: 0,
            isFreeTrial: true,
            isActive: true,
            expiryDate: expiry,
            paymentStatus: 'paid',
        });

        driver.currentSubscriptionId = sub._id;
        driver.ridesAssigned = 0;
        driver.rideLimit = plan.rideLimit;
        driver.subscriptionExpiry = expiry;
        driver.hasUsedFreeTrial = true;
        await driver.save();

        res.json({ success: true, message: `Free trial activated! You have ${plan.rideLimit} rides valid for ${plan.days} days.`, subscription: sub });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── TRAINING QUIZ RESULT ────────────────────────────────────

// POST /api/driver/quiz-complete
router.post('/quiz-complete', protect, authorize('driver'), async (req, res) => {
    try {
        const { moduleId, passed } = req.body;
        const driver = await Driver.findById(req.user.id);

        if (passed && !driver.quizzesPassed.includes(moduleId)) {
            driver.quizzesPassed.push(moduleId);
        }

        // Check if all training modules passed → grant badge
        const TrainingModule = require('../models/TrainingModule');
        const totalModules = await TrainingModule.countDocuments({ isActive: true });
        if (driver.quizzesPassed.length >= totalModules) {
            driver.trainingBadge = true;
        }

        await driver.save();
        res.json({ success: true, badgeGranted: driver.trainingBadge });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
