const axios = require('axios');

/**
 * Generate a 6-digit OTP
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via Fast2SMS - with graceful fallback
 * Returns { success, smsSent, otp } 
 * smsSent=false means OTP is returned in response for manual entry
 */
const sendOtp = async (phone, otp) => {
    // Always log OTP to console
    console.log(`\n📱 OTP for ${phone}: ${otp}\n`);

    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) {
        console.warn('⚠️ FAST2SMS_API_KEY not set in .env');
        return { success: true, smsSent: false };
    }

    try {
        // Fast2SMS OTP route (no DLT required)
        const response = await axios({
            method: 'POST',
            url: 'https://www.fast2sms.com/dev/bulkV2',
            headers: {
                authorization: apiKey,
                'Content-Type': 'application/json',
            },
            data: {
                route: 'otp',
                variables_values: otp,
                flash: 0,
                numbers: phone,
            },
            timeout: 8000,
        });

        console.log('Fast2SMS response:', JSON.stringify(response.data));

        if (response.data.return === true) {
            console.log(`✅ OTP SMS sent successfully to ${phone}`);
            return { success: true, smsSent: true };
        } else {
            console.warn('❌ Fast2SMS rejected:', response.data?.message);
            return { success: true, smsSent: false };
        }
    } catch (error) {
        const errDetail = error.response?.data || error.message;
        console.warn('❌ Fast2SMS API error:', JSON.stringify(errDetail));
        return { success: true, smsSent: false };
    }
};

/**
 * OTP expiry duration: 10 minutes
 */
const OTP_EXPIRY_MINUTES = 10;

const getOtpExpiry = () => {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
    return expiry;
};

module.exports = { generateOtp, sendOtp, getOtpExpiry };
