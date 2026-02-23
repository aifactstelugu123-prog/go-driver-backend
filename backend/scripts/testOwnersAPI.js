require('dotenv').config();
const mongoose = require('mongoose');
const Owner = require('../models/Owner');

async function testOwnersAPI() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const owners = await Owner.find().select('-otp -otpExpiry').sort({ createdAt: -1 });
        console.log('--- TEST RESULTS ---');
        console.log(`Success: true`);
        console.log(`Count: ${owners.length}`);
        if (owners.length > 0) {
            console.log('Sample Owner:', {
                id: owners[0]._id,
                name: owners[0].name,
                email: owners[0].email,
                walletBalance: owners[0].walletBalance
            });
        }
        process.exit(0);
    } catch (err) {
        console.error('Test Failed:', err.message);
        process.exit(1);
    }
}

testOwnersAPI();
