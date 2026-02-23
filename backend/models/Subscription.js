const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
    {
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Driver',
            required: true,
        },
        plan: {
            type: String,
            enum: ['free_trial', 'basic', 'standard', 'premium'],
            required: true,
        },
        planName: { type: String }, // "Free Trial", "Basic", etc.
        price: { type: Number, default: 0 }, // Amount paid (INR)
        rideLimit: { type: Number, required: true }, // Max Minimum Ride Opportunities
        ridesAssigned: { type: Number, default: 0 }, // Rides assigned so far
        isFreeTrial: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        startDate: { type: Date, default: Date.now },
        expiryDate: { type: Date, required: true },

        // Razorpay payment details
        razorpayOrderId: { type: String },
        razorpayPaymentId: { type: String },
        razorpaySignature: { type: String },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending',
        },
    },
    { timestamps: true }
);

// Virtual: is subscription currently valid
subscriptionSchema.virtual('isValid').get(function () {
    return (
        this.isActive &&
        this.ridesAssigned < this.rideLimit &&
        new Date() < this.expiryDate
    );
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
