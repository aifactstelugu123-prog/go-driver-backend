const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Owner',
            required: true,
        },
        vehicleNumber: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        vehicleType: {
            type: String,
            enum: ['Car', 'SUV', 'Luxury', 'Mini Truck', 'Heavy Vehicle'],
            required: true,
        },
        transmissionType: {
            type: String,
            enum: ['Manual', 'Automatic'],
            required: true,
        },
        make: { type: String, trim: true },
        model: { type: String, trim: true },
        variant: { type: String, trim: true },
        year: { type: Number },
        color: { type: String, trim: true },
        fuelType: { type: String, enum: ['', 'Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid', 'LPG'], default: '' },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
