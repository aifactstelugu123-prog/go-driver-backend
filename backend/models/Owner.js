const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    razorpayPaymentId: { type: String },
    createdAt: { type: Date, default: Date.now },
});

const ownerSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, unique: true, trim: true },
        email: { type: String, required: true, unique: true, trim: true, lowercase: true },
        address: { type: String, trim: true },
        dob: { type: Date },
        otp: { type: String },
        otpExpiry: { type: Date },
        isVerified: { type: Boolean, default: false },
        profileLocked: { type: Boolean, default: false }, // locked after admin verification
        acceptedTnC: { type: Boolean, default: false }, // Terms and Conditions accepted

        // ── Identity Numbers ──────────────────────────────
        aadhaarNumber: { type: String, trim: true },
        panNumber: { type: String, trim: true, uppercase: true },

        // ── Documents ─────────────────────────────────────
        documents: {
            photo: { filePath: String, uploadedAt: Date, status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' } },
            aadhaarCard: { filePath: String, uploadedAt: Date, status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' } },
            panCard: { filePath: String, uploadedAt: Date, status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' } },
        },

        profilePhoto: { type: String },
        rating: { type: Number, default: 5, min: 1, max: 5 },
        ratingCount: { type: Number, default: 0 },
        // Wallet
        walletBalance: { type: Number, default: 0 },
        walletTransactions: [walletTransactionSchema],
        activeSocketId: { type: String }, // For single-session enforcement
    },
    { timestamps: true }
);

module.exports = mongoose.model('Owner', ownerSchema);
