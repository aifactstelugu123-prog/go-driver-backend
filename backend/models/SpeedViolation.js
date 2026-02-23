const mongoose = require('mongoose');

const speedViolationSchema = new mongoose.Schema(
    {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
        driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
        speed: { type: Number, required: true }, // km/h
        maxAllowed: { type: Number, default: 60 },
        location: {
            lat: { type: Number },
            lng: { type: Number },
        },
        notifiedOwner: { type: Boolean, default: false },
        notifiedAdmin: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model('SpeedViolation', speedViolationSchema);
