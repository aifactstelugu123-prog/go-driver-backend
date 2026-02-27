const { HOURLY_RATES, PLATFORM_COMMISSION_PERCENT } = require('../config/constants');

const RETURN_PER_KM_RATE = Number(process.env.RETURN_PER_KM_RATE) || 10;

/**
 * Get hourly rate for a given vehicleType
 */
const getHourlyRate = (vehicleType) => {
    return HOURLY_RATES[vehicleType] || 200;
};

/**
 * Calculate full fare breakdown
 * @param {Object} params
 * @param {Date} params.rideStartTime
 * @param {Date} params.rideEndTime
 * @param {string} params.vehicleType
 * @param {string} params.dropVerification - 'ValidDrop' | 'ReturnedToPickup' | 'ReturnCharged'
 * @param {number} params.returnDistance - km (only relevant when ReturnCharged)
 */
const calculateFare = ({ rideStartTime, rideEndTime, vehicleType, dropVerification, returnDistance = 0 }) => {
    const hourlyRate = getHourlyRate(vehicleType);

    // Ride duration in hours (minimum 1 hour billing)
    const durationMs = new Date(rideEndTime) - new Date(rideStartTime);
    const rideHours = Math.max(durationMs / (1000 * 60 * 60), 1);

    let baseFare = 0;

    if (vehicleType === 'Heavy Vehicle') {
        // Special logic for Heavy Vehicle: ₹1200 per 8-hour block
        const blocksOf8 = Math.floor(rideHours / 8);
        const remainingHours = rideHours % 8;

        // Let's assume remaining hours are charged proportionally or at a different rate
        // We'll charge 1200 for every full 8 hours. If less than 8 hours, still charge 1200 minimum 
        // OR the user said "8 hours ki ayithe 1200 rupees charge avvali".
        // A common approach: ₹1200 minimum for up to 8 hours.
        // After 8 hours, it's (blocks * 1200) + (remaining fraction * 150) where 150 is 1200/8.
        const hourlyRateForHeavy = 1200 / 8; // ₹150 per hour

        if (rideHours <= 8) {
            baseFare = 1200; // Minimum flat ₹1200 for up to 8 hours
        } else {
            baseFare = Math.round(blocksOf8 * 1200 + remainingHours * hourlyRateForHeavy);
        }
    } else {
        // Standard logic for other vehicles
        baseFare = Math.round(rideHours * hourlyRate);
    }

    let returnCharges = 0;
    if (dropVerification === 'ReturnCharged' && returnDistance > 0) {
        returnCharges = Math.round(returnDistance * RETURN_PER_KM_RATE);
    }

    const finalAmount = baseFare + returnCharges;
    const platformCommission = Math.round((baseFare * PLATFORM_COMMISSION_PERCENT) / 100);
    const driverEarnings = baseFare - platformCommission; // commission only on baseFare

    return {
        hourlyRate,
        rideHours: Math.round(rideHours * 10) / 10,
        baseFare,
        returnDistance: Math.round(returnDistance * 10) / 10,
        returnCharges,
        finalAmount,
        platformCommission,
        driverEarnings,
    };
};

module.exports = { getHourlyRate, calculateFare };
