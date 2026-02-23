/**
 * Haversine formula: calculates distance between two lat/lng points in kilometers
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371; // Earth's radius in km

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // km
};

/**
 * Find eligible drivers within radius (km)
 * @param {Array} drivers - Array of Driver documents
 * @param {Object} pickup - { lat, lng }
 * @param {string} vehicleType
 * @param {number} radiusKm
 * @param {Set} busyDriverIds - Set of IDs of drivers currently in a ride
 */
const findEligibleDrivers = (drivers, pickup, vehicleType, radiusKm, busyDriverIds = new Set()) => {
    return drivers.filter((driver) => {
        if (!driver.isApproved || driver.isBlocked || !driver.isOnline) return false;
        if (busyDriverIds.has(driver._id.toString())) return false; // Exclude busy drivers
        if (!driver.vehicleSkills.includes(vehicleType)) return false;
        if (!driver.currentLocation || !driver.currentLocation.lat) return false;

        // Subscription check
        const now = new Date();
        if (!driver.subscriptionExpiry || driver.subscriptionExpiry < now) return false;
        if (driver.ridesAssigned >= driver.rideLimit) return false;

        const dist = haversineDistance(
            driver.currentLocation.lat,
            driver.currentLocation.lng,
            pickup.lat,
            pickup.lng
        );

        return dist <= radiusKm;
    });
};

/**
 * GPS verification at ride end
 * Returns: 'ValidDrop' | 'ReturnedToPickup' | 'ReturnCharged'
 */
const verifyRideDrop = (rideEndLocation, dropLocation, pickupLocation, threshold = 0.2) => {
    const distToDrop = haversineDistance(
        rideEndLocation.lat, rideEndLocation.lng,
        dropLocation.lat, dropLocation.lng
    );

    if (distToDrop <= threshold) return 'ValidDrop';

    const distToPickup = haversineDistance(
        rideEndLocation.lat, rideEndLocation.lng,
        pickupLocation.lat, pickupLocation.lng
    );

    if (distToPickup <= threshold) return 'ReturnedToPickup';

    return 'ReturnCharged';
};

/**
 * Calculate return distance from drop to driver home
 */
const calculateReturnDistance = (dropLocation, driverHomeLocation) => {
    return haversineDistance(
        dropLocation.lat, dropLocation.lng,
        driverHomeLocation.lat, driverHomeLocation.lng
    );
};

module.exports = {
    haversineDistance,
    findEligibleDrivers,
    verifyRideDrop,
    calculateReturnDistance,
};
