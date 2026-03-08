require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const TrainingModule = require('./models/TrainingModule');
        const res = await TrainingModule.deleteMany({ isWeekly: true });
        console.log('Deleted Weekly Modules:', res.deletedCount);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
