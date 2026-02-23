const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'transferred'],
        default: 'pending',
    },
    bankSnapshot: {
        accountHolderName: String,
        accountNumberMasked: String,  // last 4 digits only
        ifscCode: String,
        bankName: String,
        upiId: String,
    },
    adminNote: { type: String },                            // admin rejection/approval note
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    transferredAt: { type: Date },
    processedBy: { type: String },                          // admin email
}, { timestamps: true });

module.exports = mongoose.model('Payout', payoutSchema);
