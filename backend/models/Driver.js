const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, unique: true, trim: true },
        aadhaarNumber: { type: String, required: true, unique: true, trim: true },
        email: { type: String, required: true, unique: true, trim: true, lowercase: true },
        address: { type: String, trim: true },
        dob: { type: Date },
        otp: { type: String },
        otpExpiry: { type: Date },
        isVerified: { type: Boolean, default: false },
        profileLocked: { type: Boolean, default: false }, // locked after admin approval
        acceptedTnC: { type: Boolean, default: false }, // Terms and Conditions accepted

        // ── Identity Numbers ──────────────────────────────
        panNumber: { type: String, trim: true, uppercase: true },
        licenseNumber: { type: String, trim: true, uppercase: true },

        // ── Documents (each: filePath + uploadedAt + status) ─
        documents: {
            photo: { filePath: String, uploadedAt: Date, status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' } },
            aadhaarCard: { filePath: String, uploadedAt: Date, status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' } },
            panCard: { filePath: String, uploadedAt: Date, status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' } },
            drivingLicense: { filePath: String, uploadedAt: Date, status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' } },
            tenthCertificate: { filePath: String, uploadedAt: Date, status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' } },
            policeVerification: { filePath: String, uploadedAt: Date, status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' } },
            rcBook: { filePath: String, uploadedAt: Date, status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' } },
        },

        // (legacy single fields kept for backward compat)
        profilePhoto: { type: String },
        rating: { type: Number, default: 5, min: 1, max: 5 },
        ratingCount: { type: Number, default: 0 },

        // Skills: vehicle types the driver can operate
        vehicleSkills: {
            type: [String],
            enum: ['Car', 'SUV', 'Luxury', 'Mini Truck', 'Heavy Vehicle'],
            default: [],
        },

        // Home location
        homeLocation: {
            lat: { type: Number },
            lng: { type: Number },
        },

        // Current live location
        currentLocation: {
            lat: { type: Number },
            lng: { type: Number },
            updatedAt: { type: Date },
        },

        isOnline: { type: Boolean, default: false },
        isApproved: { type: Boolean, default: false },
        isBlocked: { type: Boolean, default: false },

        // Subscription info (denormalized for fast queries)
        currentSubscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
        ridesAssigned: { type: Number, default: 0 },
        rideLimit: { type: Number, default: 0 },
        subscriptionExpiry: { type: Date },

        // Free trial tracking
        hasUsedFreeTrial: { type: Boolean, default: false },

        // Training
        trainingBadge: { type: Boolean, default: false },
        quizzesPassed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TrainingModule' }],
        weeklyTraining: {
            lastPassedDate: { type: Date },
            isCleared: { type: Boolean, default: false }
        },

        // Stats
        totalRidesCompleted: { type: Number, default: 0 },
        speedViolationCount: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0 },

        // Driver Wallet
        walletBalance: { type: Number, default: 0 },
        walletTransactions: [{
            type: { type: String, enum: ['credit', 'debit'] },
            amount: { type: Number },
            description: { type: String },
            orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
            createdAt: { type: Date, default: Date.now },
        }],

        // Bank Details (encrypted at rest)
        bankDetails: {
            accountHolderName: { type: String },
            accountNumberEnc: { type: String },   // AES-256 encrypted
            ifscCode: { type: String },
            bankName: { type: String },
            upiId: { type: String },               // optional UPI ID
            isVerified: { type: Boolean, default: false },
        },
        activeSocketId: { type: String }, // For single-session enforcement
    },
    { timestamps: true }
);

module.exports = mongoose.model('Driver', driverSchema);
