const axios = require('axios');
const mongoose = require('mongoose');
const OTP = require('./models/OTP');
require('dotenv').config();

(async () => {
    try {
        console.log("🔌 Connecting to MongoDB to fetch OTP for testing...");
        await mongoose.connect(process.env.MONGO_URI);

        const testEmail = "test_otp_user@example.com";
        const otpRecord = await OTP.findOne({ email: testEmail });

        if (!otpRecord) {
            console.error("❌ No OTP found in the database. Ensure /send-otp ran properly.");
            process.exit(1);
        }

        console.log(`✅ Retrieved OTP: ${otpRecord.otp}`);

        console.log(`\n🔍 Triggering /api/auth/verify-otp as Driver Registration...`);
        const baseUrl = 'http://localhost:5000/api';

        const verifyRes = await axios.post(`${baseUrl}/auth/verify-otp`, {
            email: testEmail,
            otp: otpRecord.otp,
            role: 'driver',
            name: 'Test Setup Driver',
            phone: '9998887776'
        });

        console.log(`✅ Verify OTP Response Code:`, verifyRes.status);
        console.log(`🔑 Received JWT Token:`, verifyRes.data.token ? "YES" : "NO", verifyRes.data.token?.substring(0, 25) + "...");
        console.log(`👤 User data:`, verifyRes.data.user);

        // Cleanup
        await require('./models/Driver').deleteOne({ email: testEmail });

    } catch (e) {
        console.error("\n❌ Error querying verify-otp:", e.response ? e.response.data : e.message);
    } finally {
        await mongoose.disconnect();
    }
})();
