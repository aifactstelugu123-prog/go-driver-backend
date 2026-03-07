require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const Driver = require('./models/Driver');

(async () => {
    let driver1Id, driver2Id;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🔌 Connected to MongoDB for Testing...");

        // 1. Create Driver 1 (The Referrer)
        const validDate = new Date();
        validDate.setMonth(validDate.getMonth() + 3);

        const driver1 = new Driver({
            name: "Automated Referrer",
            phone: "+910000000001",
            email: "ref1@test.com",
            aadhaarNumber: "123412341234",
            firebaseUid: "auto_test_1",
            referralCode: "TEST" + Date.now(),
            referralValidTill: validDate,
            referralCount: 0,
            status: "approved"
        });
        await driver1.save();
        driver1Id = driver1._id;
        console.log(`\n👤 Created Diver 1: ${driver1.name}`);
        console.log(`   Referral Code: ${driver1.referralCode}`);
        console.log(`   Initial Referral Count: ${driver1.referralCount}`);

        // 2. Create Driver 2 (The Referee)
        const driver2 = new Driver({
            name: "Automated Referee",
            phone: "+910000000002",
            email: "ref2@test.com",
            aadhaarNumber: "432143214321",
            firebaseUid: "auto_test_2",
            referralCode: "TEST" + (Date.now() + 1),
            referredBy: driver1._id, // Assigning Driver 1's ObjectId
            status: "pending"
        });
        await driver2.save();
        driver2Id = driver2._id;
        console.log(`\n👤 Created Driver 2: ${driver2.name}`);
        console.log(`   Status: ${driver2.status}`);
        console.log(`   Applied Referral Code: ${driver2.referredBy}`);

        // 3. Trigger Admin Approval API
        console.log(`\n⚙️  Triggering Admin Approval for Driver 2...`);
        // Generate a fake but validly signed admin JWT based on .env secret
        const adminToken = jwt.sign({ id: 'admin123', role: 'admin' }, process.env.JWT_SECRET);
        const baseUrl = 'http://localhost:5000/api';

        const res = await axios.put(`${baseUrl}/admin/drivers/${driver2._id}/approve`, {}, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`   API Response: ${res.data.message}`);

        // 4. Verify Driver 1's Rewards
        console.log(`\n🔍 Verifying Referral Rewards applied to Driver 1...`);
        const updatedDriver1 = await Driver.findById(driver1._id);

        console.log(`   Updated Referral Count: ${updatedDriver1.referralCount}`);
        console.log(`   Active Reward Slab: ${updatedDriver1.currentRewardSlab || 'None'}`);
        console.log(`   Free Rides Expiry Date: ${updatedDriver1.freeRidesExpiryDate}`);

        if (updatedDriver1.referralCount === 1 && updatedDriver1.freeRidesExpiryDate) {
            console.log("\n✅ SUCCESS: Referral Backend Logic and Reward Allocation works perfectly!");
        } else {
            console.error("\n❌ FAILED: Referral Count did not increment or rewards missing.");
        }

    } catch (e) {
        console.error("\n❌ Error during test:", e.response ? e.response.data : e.message);
    } finally {
        // Cleanup Sandbox
        console.log("\n🧹 Cleaning up test database entries...");
        if (driver1Id) await Driver.findByIdAndDelete(driver1Id);
        if (driver2Id) await Driver.findByIdAndDelete(driver2Id);
        await mongoose.disconnect();
        console.log("Test execution finished.");
    }
})();
