const mongoose = require('mongoose');
const Driver = require('./models/Driver');
require('dotenv').config();

async function test() {
    await mongoose.connect(process.env.MONGO_URI);
    const d = await Driver.findOne();
    if (!d) return process.exit(0);
    console.log('Old:', d.referralCode);
    const upd = await Driver.findByIdAndUpdate(d._id, { referralCode: '123' }, { new: true });
    console.log('New:', upd.referralCode);
    process.exit(0);
}
test();
