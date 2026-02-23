require('dotenv').config();
const mongoose = require('mongoose');
const Owner = require('../models/Owner');
const Driver = require('../models/Driver');

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const ownerCount = await Owner.countDocuments();
        const driverCount = await Driver.countDocuments();
        console.log(`Owners in DB: ${ownerCount}`);
        console.log(`Drivers in DB: ${driverCount}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUsers();
