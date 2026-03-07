const axios = require('axios');
const jwt = require('jsonwebtoken');

(async () => {
    try {
        console.log("🔍 Fetching live API response for existing Driver...");

        // Login as an existing mock driver from earlier (auto_test_1)
        const baseUrl = 'https://go-driver-backend-1.onrender.com/api';

        const loginRes = await axios.post(`${baseUrl}/auth/driver/login`, {
            uid: "auto_test_1",
            phone: "+910000000001",
            name: "Automated Referrer"
        });

        const token = loginRes.data.token;
        console.log("✅ Authenticated. API Token received.");

        // Fetch Referral Status
        const refRes = await axios.get(`${baseUrl}/referral/status`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("\n📦 Referral Status Payload:");
        console.log(JSON.stringify(refRes.data, null, 2));

        if (refRes.data.referralCode) {
            console.log("\n✅ SUCCESS: The Live API is successfully auto-generating and returning referral codes!");
        } else {
            console.error("\n❌ FAILED: Referral code is still null/missing in the API response.");
        }

    } catch (e) {
        console.error("\n❌ Error querying live API:", e.response ? e.response.data : e.message);
    }
})();
