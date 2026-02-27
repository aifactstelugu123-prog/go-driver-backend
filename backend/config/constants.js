// Hourly rates by vehicle type (INR per hour)
const HOURLY_RATES = {
    Car: 200,
    SUV: 300,
    Luxury: 500,
    'Mini Truck': 350,
    'Heavy Vehicle': 600,
};

const VEHICLE_TYPES = Object.keys(HOURLY_RATES);

const SUBSCRIPTION_PLANS = {
    free_trial: { name: 'Free Trial', price: 0, rideLimit: 50, days: 30 },
    basic: { name: 'Basic', price: 99, rideLimit: 3, days: 30 },
    standard: { name: 'Standard', price: 199, rideLimit: 6, days: 30 },
    premium: { name: 'Premium', price: 499, rideLimit: 15, days: 30 },
};

const ORDER_STATUS = {
    SEARCHING: 'Searching',
    ACCEPTED: 'Accepted',
    ACTIVE: 'Active',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
};

const MAX_SPEED_KMH = 60;
const INITIAL_SEARCH_RADIUS_KM = 5;
const EXPANDED_SEARCH_RADIUS_KM = 10;
const DRIVER_ACCEPT_TIMEOUT_MS = 30000;
const DROP_VERIFICATION_RADIUS_M = 200;
const PLATFORM_COMMISSION_PERCENT = Number(process.env.PLATFORM_COMMISSION) || 10;

module.exports = {
    HOURLY_RATES,
    VEHICLE_TYPES,
    SUBSCRIPTION_PLANS,
    ORDER_STATUS,
    MAX_SPEED_KMH,
    INITIAL_SEARCH_RADIUS_KM,
    EXPANDED_SEARCH_RADIUS_KM,
    DRIVER_ACCEPT_TIMEOUT_MS,
    DROP_VERIFICATION_RADIUS_M,
    PLATFORM_COMMISSION_PERCENT,
};
