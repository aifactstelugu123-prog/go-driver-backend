const TrainingModule = require('../models/TrainingModule');
const Driver = require('../models/Driver');

const commonSigns = {
    stop: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/India_Road_Sign_-_Stop.svg/120px-India_Road_Sign_-_Stop.svg.png',
    giveWay: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/India_Road_Sign_-_Give_Way.svg/120px-India_Road_Sign_-_Give_Way.svg.png',
    noEntry: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/India_Road_Sign_-_No_Entry.svg/120px-India_Road_Sign_-_No_Entry.svg.png',
    noUTurn: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/India_Road_Sign_-_No_U-turn.svg/120px-India_Road_Sign_-_No_U-turn.svg.png',
    noOvertaking: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/India_Road_Sign_-_No_Overtaking.svg/120px-India_Road_Sign_-_No_Overtaking.svg.png',
    narrowBridge: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/India_Road_Sign_-_Narrow_Bridge.svg/120px-India_Road_Sign_-_Narrow_Bridge.svg.png',
    schoolAhead: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/India_Road_Sign_-_School_Ahead.svg/120px-India_Road_Sign_-_School_Ahead.svg.png',
    menAtWork: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/India_Road_Sign_-_Men_at_work.svg/120px-India_Road_Sign_-_Men_at_work.svg.png',
    roundabout: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/India_Road_Sign_-_Roundabout.svg/120px-India_Road_Sign_-_Roundabout.svg.png',
    oneWay: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/India_Road_Sign_-_One_Way.svg/120px-India_Road_Sign_-_One_Way.svg.png'
};

const RTO_POOL = [
    { question: 'What is the fine for driving without a valid license in India?', symbolUrl: commonSigns.noEntry, options: ['₹500', '₹1000', '₹5000', '₹2000'], correctIndex: 2 },
    { question: 'Identify this mandatory sign:', symbolUrl: commonSigns.stop, options: ['Yield', 'Go', 'Stop', 'Slow Down'], correctIndex: 2 },
    { question: 'The octagon shape sign always means:', symbolUrl: commonSigns.stop, options: ['Yield', 'Stop', 'Caution', 'One Way'], correctIndex: 1 },
    { question: 'This sign means you must:', symbolUrl: commonSigns.giveWay, options: ['Stop', 'Yield/Give Way', 'Go Fast', 'No Entry'], correctIndex: 1 },
    { question: 'Identify this prohibitory sign:', symbolUrl: commonSigns.noUTurn, options: ['No Right Turn', 'No Left Turn', 'No U-Turn', 'No Entry'], correctIndex: 2 },
    { question: 'What does this sign indicate?', symbolUrl: commonSigns.narrowBridge, options: ['Narrow Road', 'Narrow Bridge', 'Slippery Road', 'Dead End'], correctIndex: 1 },
    { question: 'Seeing this, you should:', symbolUrl: commonSigns.schoolAhead, options: ['Speed Up', 'Slow Down & Be Careful', 'Stop', 'Honk Loudly'], correctIndex: 1 },
    { question: 'What is the blood alcohol limit for drivers in India?', symbolUrl: commonSigns.noEntry, options: ['0.03%', '0.05%', '0.08%', 'Zero'], correctIndex: 0 },
    { question: 'This sign indicates:', symbolUrl: commonSigns.menAtWork, options: ['No Entry', 'Men at Work', 'Pedestrians Only', 'Construction Only'], correctIndex: 1 },
    { question: 'Mandatory signs are usually in:', symbolUrl: commonSigns.stop, options: ['Triangles', 'Circles', 'Squares', 'Rectangles'], correctIndex: 1 },
    { question: 'What is the penalty for using a mobile phone while driving?', symbolUrl: commonSigns.noEntry, options: ['₹100', '₹500', '₹5000', '₹10000'], correctIndex: 2 },
    { question: 'Identify this sign:', symbolUrl: commonSigns.roundabout, options: ['U-Turn', 'Roundabout', 'Merge', 'Curves Ahead'], correctIndex: 1 },
    { question: 'This sign indicates a:', symbolUrl: commonSigns.oneWay, options: ['No Entry', 'Two Way Road', 'One Way Road', 'Dead End'], correctIndex: 2 },
    { question: 'Yellow light at a signal means:', symbolUrl: commonSigns.stop, options: ['Speed Up', 'Slow Down & Stop if Safe', 'Stop Immediately', 'Go if clear'], correctIndex: 1 },
    { question: 'The speed limit in school zones is usually:', symbolUrl: commonSigns.schoolAhead, options: ['25 km/h', '40 km/h', '50 km/h', '60 km/h'], correctIndex: 0 }
];

const getWeekCode = () => {
    const now = new Date();
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((now - oneJan) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
    return `${now.getFullYear()}-W${week.toString().padStart(2, '0')}`;
};

const ensureWeeklyModule = async (language = 'English') => {
    const weekCode = getWeekCode();
    let module = await TrainingModule.findOne({ weekCode, language, isWeekly: true });

    if (!module) {
        // Pick 10 random questions from the pool for a full 10-question quiz
        const shuffled = [...RTO_POOL].sort(() => 0.5 - Math.random());
        const selectedQuiz = shuffled.slice(0, 10);

        module = await TrainingModule.create({
            title: `Weekly RTO Challenge (${weekCode}) - ${language}`,
            language,
            category: 'Safety Rules',
            description: `Weekly mandatory update on RTO rules and road safety. Complete to maintain your verified status.`,
            videoUrl: 'https://www.youtube.com/embed/Pj1id3r0e_U',
            isWeekly: true,
            weekCode,
            quiz: selectedQuiz,
            passMark: 90, // Weekly updates require 90% to ensure mastery
            order: 999
        });
        console.log(`Generated new weekly module for ${language}: ${weekCode}`);
    }
    return module;
};

const checkAndResetDriverWeeklyStatus = async (driverId) => {
    const driver = await Driver.findById(driverId);
    if (!driver) return;
    const lastDate = driver.weeklyTraining?.lastPassedDate;
    if (!lastDate || (new Date() - lastDate) > 7 * 24 * 60 * 60 * 1000) {
        if (driver.weeklyTraining?.isCleared) {
            driver.weeklyTraining.isCleared = false;
            await driver.save();
        }
    }
};

module.exports = { ensureWeeklyModule, checkAndResetDriverWeeklyStatus, getWeekCode };
