const mongoose = require('mongoose');

// Stores platform-level config — admin bank details + settlement records
const adminConfigSchema = new mongoose.Schema({
    // Admin bank details (for platform fee collection)
    bankDetails: {
        accountHolderName: { type: String },
        accountNumber: { type: String },   // stored plain — only admin sees this
        ifscCode: { type: String },
        bankName: { type: String },
        upiId: { type: String },
    },
    // Settlement records (manually mark when earnings are transferred out)
    settlements: [{
        amount: { type: Number },
        note: { type: String },
        settledAt: { type: Date, default: Date.now },
    }],
}, { timestamps: true });

module.exports = mongoose.model('AdminConfig', adminConfigSchema);
