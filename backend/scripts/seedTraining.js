require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const TrainingModule = require('../models/TrainingModule');

const commonSigns = {
    stop: '/signs/stop.png',
    giveWay: '/signs/giveWay.png',
    noEntry: '/signs/noEntry.png',
    noUTurn: '/signs/noUTurn.png',
    noOvertaking: '/signs/noOvertaking.png',
    narrowBridge: '/signs/narrowBridge.png',
    schoolAhead: '/signs/schoolAhead.png',
    menAtWork: '/signs/menAtWork.png',
    roundabout: '/signs/roundabout.png',
    oneWay: '/signs/oneWay.png',
    rightTurn: '/signs/rightTurn.png',
    leftTurn: '/signs/leftTurn.png',
    hornProhibited: '/signs/hornProhibited.png'
};

const modules = [
    {
        title: 'Indian Traffic Signs & Signals (English)',
        language: 'English',
        category: 'Traffic Signals',
        description: 'Comprehensive guide to Mandatory, Cautionary, and Informatory signs for Indian roads.',
        videoUrl: 'https://youtu.be/uMKdkozl6qI?si=4bf74u_EQ40LEAv5', // User-provided English link
        duration: 30,
        passMark: 80,
        order: 1,
        quiz: [
            { question: 'What does this sign mean?', symbolUrl: commonSigns.stop, options: ['Yield', 'Go', 'Stop', 'Slow Down'], correctIndex: 2 },
            { question: 'Identify this sign:', symbolUrl: commonSigns.giveWay, options: ['No Entry', 'Give Way', 'One Way', 'Stop'], correctIndex: 1 },
            { question: 'What is indicated by this sign?', symbolUrl: commonSigns.noEntry, options: ['Entry Allowed', 'Exit Only', 'No Entry', 'No Parking'], correctIndex: 2 },
            { question: 'This sign prohibits:', symbolUrl: commonSigns.noUTurn, options: ['Right Turn', 'Left Turn', 'U-Turn', 'Overtaking'], correctIndex: 2 },
            { question: 'What does this sign mean?', symbolUrl: commonSigns.noOvertaking, options: ['No Overtaking', 'No Parking', 'No Horn', 'Speed Limit'], correctIndex: 0 },
            { question: 'This warning sign indicates:', symbolUrl: commonSigns.narrowBridge, options: ['Narrow Road', 'Narrow Bridge', 'Slippery Road', 'Uneven Road'], correctIndex: 1 },
            { question: 'What should you do seeing this sign?', symbolUrl: commonSigns.schoolAhead, options: ['Speed Up', 'Slow Down (School Ahead)', 'Stop', 'Honk Loudly'], correctIndex: 1 },
            { question: 'Identify this sign:', symbolUrl: commonSigns.menAtWork, options: ['No Entry', 'Pedestrians Only', 'Men at Work', 'Danger'], correctIndex: 2 },
            { question: 'This mandatory sign indicates:', symbolUrl: commonSigns.roundabout, options: ['Right Turn', 'Roundabout', 'Merge Ahead', 'No Entry'], correctIndex: 1 },
            { question: 'What does this sign signify?', symbolUrl: commonSigns.oneWay, options: ['No Entry', 'Two Way Road', 'One Way Road', 'Parking'], correctIndex: 2 }
        ]
    },
    {
        title: 'ట్రాఫిక్ సిగ్నల్స్ & చిహ్నాలు (Telugu)',
        language: 'Telugu',
        category: 'Traffic Signals',
        description: 'భారతీయ రహదారి చిహ్నాలు మరియు నియమాల గురించి సమగ్ర సమాచారం.',
        videoUrl: 'https://youtu.be/-Ncwi4UHfh4?si=kw738o3fPDcYbf7J', // User-provided Telugu link
        duration: 30,
        passMark: 80,
        order: 2,
        quiz: [
            { question: 'ఈ చిహ్నం అర్థం ఏమిటి?', symbolUrl: commonSigns.stop, options: ['దారి ఇవ్వండి', 'వెళ్ళండి', 'ఆగండి (Stop)', 'నెమ్మదిగా'], correctIndex: 2 },
            { question: 'ఈ చిహ్నాన్ని గుర్తించండి:', symbolUrl: commonSigns.giveWay, options: ['నో ఎంట్రీ', 'దారి ఇవ్వండి (Give Way)', 'వన్ వే', 'ఆగండి'], correctIndex: 1 },
            { question: 'ఈ చిహ్నం దేనిని తెలుపుతుంది?', symbolUrl: commonSigns.noEntry, options: ['ప్రవేశం కలదు', 'ఎగ్జిట్ మాత్రమే', 'నో ఎంట్రీ (No Entry)', 'నో పార్కింగ్'], correctIndex: 2 },
            { question: 'ఈ చిహ్నం దేనిని నిషేధిస్తుంది?', symbolUrl: commonSigns.noUTurn, options: ['కుడి మలుపు', 'ఎడమ మలుపు', 'యు-టర్న్ (U-Turn)', 'ఓవర్ టేకింగ్'], correctIndex: 2 },
            { question: 'ఈ చిహ్నం అర్థం ఏమిటి?', symbolUrl: commonSigns.noOvertaking, options: ['ఓవర్ టేకింగ్ చేయరాదు', 'పార్కింగ్ చేయరాదు', 'హారన్ కొట్టరాదు', 'వేగ పరిమితి'], correctIndex: 0 },
            { question: 'ఈ హెచ్చరిక చిహ్నం దేనిని సూచిస్తుంది?', symbolUrl: commonSigns.narrowBridge, options: ['ఇరుకైన రోడ్డు', 'ఇరుకైన వంతెన (Narrow Bridge)', 'జారే రోడ్డు', 'గొయ్యి ఉంది'], correctIndex: 1 },
            { question: 'ఈ చిహ్నం చూసినప్పుడు మీరు ఏమి చేయాలి?', symbolUrl: commonSigns.schoolAhead, options: ['వేగం పెంచాలి', 'వేగం తగ్గించాలి (పాఠశాల ఉంది)', 'ఆగాలి', 'గట్టిగా హారన్ కొట్టాలి'], correctIndex: 1 },
            { question: 'ఈ చిహ్నాన్ని గుర్తించండి:', symbolUrl: commonSigns.menAtWork, options: ['నో ఎంట్రీ', 'పాదాచారులకు మాత్రమే', 'పని జరుగుతోంది (Men at Work)', 'ప్రమాదం'], correctIndex: 2 },
            { question: 'ఈ చిహ్నం దేనిని సూచిస్తుంది?', symbolUrl: commonSigns.roundabout, options: ['కుడి మలుపు', 'రౌండ్‌అబౌట్ (Roundabout)', 'ముందు రోడ్డు కలుస్తుంది', 'నో ఎంట్రీ'], correctIndex: 1 },
            { question: 'ఈ చిహ్నం దేనిని తెలియజేస్తుంది?', symbolUrl: commonSigns.oneWay, options: ['నో ఎంట్రీ', 'టూ వే రోడ్డు', 'వన్ వే రోడ్డు (One Way)', 'పార్కింగ్'], correctIndex: 2 }
        ]
    },
    {
        title: 'यातायात संकेत और नियम (Hindi)',
        language: 'Hindi',
        category: 'Traffic Signals',
        description: 'भारतीय सड़क संकेतों और नियमों के बारे में विस्तृत जानकारी।',
        videoUrl: 'https://youtu.be/RKvuElgpuXw?si=dGKfhkgze1MNUCx-', // User-provided Hindi link
        duration: 30,
        passMark: 80,
        order: 3,
        quiz: [
            { question: 'इस संकेत का क्या अर्थ है?', symbolUrl: commonSigns.stop, options: ['रास्ता दें', 'जाएं', 'रूकें (Stop)', 'धीरे चलें'], correctIndex: 2 },
            { question: 'इस संकेत को पहचानें:', symbolUrl: commonSigns.giveWay, options: ['प्रवेश निषेध', 'रास्ता दें (Give Way)', 'एकतरफा रास्ता', 'रूकें'], correctIndex: 1 },
            { question: 'यह संकेत क्या दर्शाता है?', symbolUrl: commonSigns.noEntry, options: ['प्रवेश खुला है', 'केवल निकास', 'प्रवेश निषेध (No Entry)', 'पार्किंग नहीं'], correctIndex: 2 },
            { question: 'यह संकेत क्या प्रतिबंधित करता है?', symbolUrl: commonSigns.noUTurn, options: ['दायां मोड़', 'बायां मोड़', 'यू-टर्न (U-Turn)', 'ओवरटेकिंग'], correctIndex: 2 },
            { question: 'इस संकेत का क्या अर्थ है?', symbolUrl: commonSigns.noOvertaking, options: ['ओवरटेकिंग निषेध', 'पार्किंग निषेध', 'हॉर्न निषेध', 'गति सीमा'], correctIndex: 0 },
            { question: 'यह चेतावनी संकेत क्या दर्शाता है?', symbolUrl: commonSigns.narrowBridge, options: ['तंग सड़क', 'तंग पुल (Narrow Bridge)', 'फिसलन भरी सड़क', 'आगे गड्ढा है'], correctIndex: 1 },
            { question: 'इस संकेत को देखकर आपको क्या करना चाहिए?', symbolUrl: commonSigns.schoolAhead, options: ['गति बढ़ाएं', 'गति धीमी करें (आगे स्कूल है)', 'रूक जाएं', 'तेज हॉर्न बजाएं'], correctIndex: 1 },
            { question: 'इस संकेत को पहचानें:', symbolUrl: commonSigns.menAtWork, options: ['प्रवेश निषेध', 'केवल पैदल यात्री', 'कार्य जारी है (Men at Work)', 'खतरा'], correctIndex: 2 },
            { question: 'यह अनिवार्य संकेत क्या दर्शाता है?', symbolUrl: commonSigns.roundabout, options: ['दायां मोड़', 'गोलचक्कर (Roundabout)', 'आगे विलय', 'प्रवेश निषेध'], correctIndex: 1 },
            { question: 'यह संकेत क्या दर्शाता है?', symbolUrl: commonSigns.oneWay, options: ['प्रवेश निषेध', 'दो तरफा रास्ता', 'एकतरफा रास्ता (One Way)', 'पार्किंग'], correctIndex: 2 }
        ]
    }
];

async function seed() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/daas';
        await mongoose.connect(mongoUri);
        console.log(`Final Multi-Lang 10-Question Seed to: ${mongoUri}...`);
        for (const mod of modules) {
            await TrainingModule.findOneAndUpdate({ title: mod.title }, mod, { upsert: true, new: true, returnDocument: 'after' });
            console.log(`Seeded: ${mod.title} (${mod.language})`);
        }
        console.log('Seeding complete! 🚦🇮🇳✅');
        process.exit(0);
    } catch (err) {
        console.error('Seed Error:', err);
        process.exit(1);
    }
}
seed();
