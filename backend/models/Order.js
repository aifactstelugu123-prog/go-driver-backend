const mongoose = require('mongoose');

// Track all GPS points during ride
const routePointSchema = new mongoose.Schema(
    {
        lat: Number,
        lng: Number,
        speed: Number, // km/h
        timestamp: { type: Date, default: Date.now },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
        driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
        vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
        vehicleType: {
            type: String,
            enum: ['Car', 'SUV', 'Luxury', 'Mini Truck', 'Heavy Vehicle'],
            required: true,
        },

        // Locations
        pickupLocation: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
            address: { type: String },
        },
        dropLocation: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
            address: { type: String },
        },

        scheduledAt: { type: Date, required: true },

        // OTPs
        startOtp: { type: String },
        startOtpExpiry: { type: Date },
        endOtp: { type: String },
        endOtpExpiry: { type: Date },

        // Status
        status: {
            type: String,
            enum: ['Searching', 'Accepted', 'Active', 'Completed', 'Cancelled'],
            default: 'Searching',
        },

        // GPS data
        rideStartLocation: { lat: Number, lng: Number },
        rideEndLocation: { lat: Number, lng: Number },
        routeHistory: [routePointSchema],

        // Time
        rideStartTime: { type: Date },
        rideEndTime: { type: Date },

        // Fare
        hourlyRate: { type: Number }, // INR/hour
        rideHours: { type: Number },
        baseFare: { type: Number },
        returnDistance: { type: Number }, // km
        returnCharges: { type: Number, default: 0 },
        finalAmount: { type: Number },
        platformCommission: { type: Number },
        driverEarnings: { type: Number },

        // GPS verification result
        dropVerification: {
            type: String,
            enum: ['ValidDrop', 'ReturnedToPickup', 'ReturnCharged', null],
            default: null,
        },

        // Cancellation
        cancelReason: { type: String },
        cancelledBy: { type: String, enum: ['owner', 'driver', 'admin', null], default: null },

        // Round Trip Support
        isRoundTrip: { type: Boolean, default: false },
        isReturnLeg: { type: Boolean, default: false },
        turnaroundTime: { type: Date },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
