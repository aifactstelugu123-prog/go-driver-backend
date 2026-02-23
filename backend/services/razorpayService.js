const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order
 * @param {number} amount - Amount in INR (will be converted to paise)
 * @param {string} receipt - Unique receipt ID
 */
const createRazorpayOrder = async (amount, receipt) => {
    const options = {
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        receipt,
        payment_capture: 1,
    };
    const order = await razorpay.orders.create(options);
    return order;
};

/**
 * Verify Razorpay payment signature
 */
const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const expectedSignature = hmac.digest('hex');
    return expectedSignature === razorpaySignature;
};

module.exports = { createRazorpayOrder, verifyPaymentSignature };
