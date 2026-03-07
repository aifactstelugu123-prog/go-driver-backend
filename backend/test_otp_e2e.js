const axios = require('axios');
const mongoose = require('mongoose');
const OTP = require('./models/OTP');
require('dotenv').config();

(async () => {
    try {
        console.log("🔌 Triggering /api/auth/send-otp...");
        const baseUrl = 'http://localhost:5000/api';
        const testEmail = "test_otp_user2@example.com";

        const sendRes = await axios.post(`${baseUrl}/auth/send-otp`, { email: testEmail });
        console.log(`✅ Send OTP Response:`, sendRes.data);

        // Connect to Mongo to extract the generated OTP for the test
        await mongoose.connect(process.env.MONGO_URI);
        const otpRecord = await OTP.findOne({ email: testEmail });

        if (!otpRecord) throw new Error("OTP not saved in Database");
        console.log(`✅ Retrieved OTP: ${otpRecord.otp}`);

        console.log(`\n🔍 Triggering /api/auth/verify-otp...`);
        const verifyRes = await axios.post(`${baseUrl}/auth/verify-otp`, {
            email: testEmail,
            otp: otpRecord.otp,
            role: 'owner',
            name: 'Test Owner',
            phone: '9998887779'
        });

        console.log(`✅ Verify OTP Response Code:`, verifyRes.status);
        console.log(`🔑 Received JWT Token:`, verifyRes.data.token ? "YES" : "NO");
        console.log(`👤 User data:`, verifyRes.data.user);

        // Cleanup
        await require('./models/Owner').deleteOne({ email: testEmail });

    } catch (e) {
        console.error("\n❌ Error querying API:", e.response ? JSON.stringify(e.response.data) : e.message);
    } finally {
        await mongoose.disconnect();
    }
})();
