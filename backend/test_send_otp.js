const axios = require('axios');

(async () => {
    try {
        console.log("🔍 Triggering /api/auth/send-otp...");
        const baseUrl = 'http://localhost:5000/api';

        const testEmail = "test_otp_user@example.com";

        const sendRes = await axios.post(`${baseUrl}/auth/send-otp`, {
            email: testEmail
        });

        console.log(`✅ Send OTP Response:`, sendRes.data);
        console.log(`\n\n⚠️ Check the backend terminal console for the MOCK MODE OTP printed out!`);

    } catch (e) {
        console.error("\n❌ Error querying send-otp:", e.response ? e.response.data : e.message);
    }
})();
