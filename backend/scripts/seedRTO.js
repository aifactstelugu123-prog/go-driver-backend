require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const RTOQuestion = require('../models/RTOQuestion');

const questions = [
    // --- Traffic Signs ---
    {
        questionText: "What does this traffic sign mean?",
        imageUrl: "/signs/stop.png",
        options: ["Stop", "Give way", "No entry"],
        correctIndex: 0,
        category: "Sign"
    },
    {
        questionText: "Identify this sign:",
        imageUrl: "/signs/giveWay.png",
        options: ["Give Way", "One way", "No parking"],
        correctIndex: 0,
        category: "Sign"
    },
    {
        questionText: "What is indicated by this sign?",
        imageUrl: "/signs/noEntry.png",
        options: ["No Entry", "Overtaking prohibited", "U-turn prohibited"],
        correctIndex: 0,
        category: "Sign"
    },
    {
        questionText: "This sign represents:",
        imageUrl: "/signs/leftTurn.png",
        options: ["Right turn prohibited", "Left turn prohibited", "No U-turn"],
        correctIndex: 1,
        category: "Sign"
    },
    {
        questionText: "What does this sign mean?",
        imageUrl: "/signs/rightTurn.png",
        options: ["Right turn prohibited", "Left turn prohibited", "Overtaking prohibited"],
        correctIndex: 0,
        category: "Sign"
    },
    {
        questionText: "Identify the sign:",
        imageUrl: "/signs/noUTurn.png",
        options: ["No entry", "One way", "U-turn prohibited"],
        correctIndex: 2,
        category: "Sign"
    },

    // --- Traffic Rules ---
    {
        questionText: "When a vehicle is involved in an accident causing injury to any person, what should the driver do?",
        options: [
            "Take the vehicle to the nearest police station",
            "Take all reasonable steps to secure medical attention for the injured and report to the nearest police station within 24 hours",
            "Drive away as fast as possible to avoid crowd"
        ],
        correctIndex: 1,
        imageUrl: "/signs/accident.png",
        category: "Rule"
    },
    {
        questionText: "Overtaking is prohibited in which of the following circumstances?",
        options: [
            "When the road ahead is clearly visible",
            "When the vehicle is passing through a curve or a bridge",
            "At night time on a straight road"
        ],
        correctIndex: 1,
        imageUrl: "/signs/noOvertaking.png",
        category: "Rule"
    },
    {
        questionText: "While driving, if you are approaching a pedestrian crossing where people are waiting to cross the road, you should:",
        options: [
            "Sound horn and proceed",
            "Slow down, stop the vehicle and let them cross",
            "Increase speed and pass quickly"
        ],
        correctIndex: 1,
        imageUrl: "/signs/pedestrianCrossing.png",
        category: "Rule"
    },
    {
        questionText: "In a 'One Way' road, which of the following is true?",
        options: [
            "Parking is prohibited",
            "Overtaking is prohibited",
            "Reversing is prohibited"
        ],
        correctIndex: 2,
        imageUrl: "/signs/oneWay.png",
        category: "Rule"
    },
    {
        questionText: "The maximum speed limit for motor cycles on city roads is:",
        options: ["40 km/hr", "60 km/hr", "No limit"],
        correctIndex: 0,
        imageUrl: "/signs/speedLimit.png",
        category: "Rule"
    },

    // --- Situations ---
    {
        questionText: "You are approaching a narrow bridge, another vehicle is about to enter the bridge from opposite side. You should:",
        options: [
            "Increase speed and try to cross first",
            "Wait till the other vehicle passes the bridge and then proceed",
            "Put on head light and pass the bridge"
        ],
        correctIndex: 1,
        imageUrl: "/signs/narrowBridge.png",
        category: "Situation"
    },
    {
        questionText: "When an ambulance is approaching with a siren, the driver of the vehicle shall:",
        options: [
            "Allow free passage by drawing to the side of the road",
            "Not allow passage if there is no space",
            "Follow the ambulance at the same speed"
        ],
        correctIndex: 0,
        category: "Situation"
    },
    {
        questionText: "Red light in traffic signal indicates:",
        options: ["Proceed with caution", "Stop the vehicle", "Slow down"],
        correctIndex: 1,
        imageUrl: "/signs/redLight.png",
        category: "Situation"
    },
    {
        questionText: "While parking your vehicle on a descending hill, you should:",
        options: [
            "Engage hand brake and put in reverse gear",
            "Engage hand brake and put in first gear",
            "Leave the vehicle in neutral"
        ],
        correctIndex: 0,
        category: "Situation"
    },
    {
        questionText: "What the yellow light follows red at a traffic signal, you should:",
        options: [
            "Start the engine and be ready to go",
            "Sound horn and proceed",
            "Stop if you have already crossed the line"
        ],
        correctIndex: 0,
        imageUrl: "/signs/redLight.png",
        category: "Situation"
    },
    // --- Telugu Translations ---
    {
        questionText: "ఈ ట్రాఫిక్ సిగ్నల్ అర్థం ఏమిటి?",
        imageUrl: "/signs/stop.png",
        options: ["ఆగండి (Stop)", "దారి ఇవ్వండి (Give way)", "ప్రవేశం లేదు (No entry)"],
        correctIndex: 0,
        category: "Sign",
        language: "Telugu"
    },
    {
        questionText: "ఈ గుర్తు దేనిని సూచిస్తుంది?",
        imageUrl: "/signs/giveWay.png",
        options: ["దారి ఇవ్వండి (Give Way)", "ఒక వైపు మార్గం (One way)", "పార్కింగ్ నిషేధం (No parking)"],
        correctIndex: 0,
        category: "Sign",
        language: "Telugu"
    },
    {
        questionText: "పాదచారుల క్రాసింగ్ వద్ద మనుషులు రోడ్డు దాటడానికి వేచి ఉన్నప్పుడు మీరు ఏమి చేయాలి?",
        options: [
            "హారన్ కొట్టి ముందుకు వెళ్లాలి",
            "వాహనాన్ని ఆపి వారు రోడ్డు దాటే వరకు వేచి ఉండాలి",
            "వేగంగా వెళ్ళాలి"
        ],
        correctIndex: 1,
        imageUrl: "/signs/pedestrianCrossing.png",
        category: "Rule",
        language: "Telugu"
    },
    {
        questionText: "ట్రాఫిక్ సిగ్నల్ వద్ద ఎరుపు లైట్ దేనిని సూచిస్తుంది?",
        options: ["జాగ్రత్తగా వెళ్ళండి", "వాహనాన్ని ఆపండి", "వేగం తగ్గించండి"],
        correctIndex: 1,
        imageUrl: "/signs/redLight.png",
        category: "Situation",
        language: "Telugu"
    },
    {
        questionText: "వన్ వే (One Way) రోడ్డులో ఈ క్రింది వాటిలో ఏది నిజం?",
        options: [
            "పార్కింగ్ నిషేధించబడింది",
            "ఓవర్‌టేకింగ్ నిషేధించబడింది",
            "రివర్స్ వెళ్లడం నిషేధించబడింది"
        ],
        correctIndex: 2,
        imageUrl: "/signs/oneWay.png",
        category: "Rule",
        language: "Telugu"
    },
    {
        questionText: "ఈ గుర్తు దేనిని సూచిస్తుంది?",
        imageUrl: "/signs/noEntry.png",
        options: ["నో ఎంట్రీ (No Entry)", "ముందుకు వెళ్ళవచ్చు", "నిదానంగా వెళ్ళండి"],
        correctIndex: 0,
        category: "Sign",
        language: "Telugu"
    },
    {
        questionText: "ఈ గుర్తు అర్థం ఏమిటి?",
        imageUrl: "/signs/leftTurn.png",
        options: ["ఎడమ మలుపు తిరగవచ్చు", "ఎడమ మలుపు నిషేధం (Left turn prohibited)", "కుడి మలుపు నిషేధం"],
        correctIndex: 1,
        category: "Sign",
        language: "Telugu"
    },
    {
        questionText: "ఈ గుర్తు దేనిని తెలుపుతుంది?",
        imageUrl: "/signs/rightTurn.png",
        options: ["కుడి మలుపు నిషేధం (Right turn prohibited)", "కుడి వైపు వెళ్ళండి", "యూ-టర్న్ నిషేధం"],
        correctIndex: 0,
        category: "Sign",
        language: "Telugu"
    },
    {
        questionText: "ఈ గుర్తు దేనిని సూచిస్తుంది?",
        imageUrl: "/signs/noUTurn.png",
        options: ["యూ-టర్న్ నిషేధం (U-turn prohibited)", "వెనక్కి వెళ్ళవచ్చు", "వన్ వే"],
        correctIndex: 0,
        category: "Sign",
        language: "Telugu"
    },
    {
        questionText: "ఒక వాహనం ప్రమాదానికి గురై ఎవరికైనా గాయాలైనప్పుడు, డ్రైవర్ ఏమి చేయాలి?",
        options: [
            "వాహనాన్ని సమీప పోలీస్ స్టేషన్‌కు తీసుకెళ్లాలి",
            "గాయపడిన వారికి వైద్య సహాయం అందించి, 24 గంటల్లో పోలీసులకు నివేదించాలి",
            "అక్కడి నుండి వేగంగా వెళ్ళిపోవాలి"
        ],
        correctIndex: 1,
        imageUrl: "/signs/accident.png",
        category: "Rule",
        language: "Telugu"
    },
    {
        questionText: "ఏ సందర్భాలలో ఓవర్‌టేకింగ్ నిషేధించబడింది?",
        options: [
            "ముందు రోడ్డు స్పష్టంగా కనిపిస్తున్నప్పుడు",
            "వంతెనలు లేదా మలుపుల వద్ద",
            "రాత్రి సమయంలో నేరుగా ఉన్న రోడ్డుపై"
        ],
        correctIndex: 1,
        imageUrl: "/signs/noOvertaking.png",
        category: "Rule",
        language: "Telugu"
    },
    {
        questionText: "సిటీ రోడ్లపై మోటార్ సైకిళ్లకు గరిష్ట వేగ పరిమితి ఎంత?",
        options: ["40 కి.మీ/గం", "60 కి.మీ/గం", "పరిమితి లేదు"],
        correctIndex: 0,
        imageUrl: "/signs/speedLimit.png",
        category: "Rule",
        language: "Telugu"
    },
    {
        questionText: "మీరు ఒక ఇరుకైన వంతెనను సమీపిస్తున్నప్పుడు, ఎదురుగా మరో వాహనం వస్తోంది. మీరు ఏమి చేయాలి?",
        options: [
            "వేగం పెంచి ముందుగా దాటాలి",
            "ఎదుటి వాహనం వెళ్ళే వరకు వేచి ఉండి, ఆపై వెళ్ళాలి",
            "హెడ్ లైట్ వేసి వెళ్ళాలి"
        ],
        correctIndex: 1,
        imageUrl: "/signs/narrowBridge.png",
        category: "Situation",
        language: "Telugu"
    },
    {
        questionText: "అంబులెన్స్ సైరన్ వేస్తూ సమీపిస్తున్నప్పుడు, వాహన డ్రైవర్ ఏమి చేయాలి?",
        options: [
            "రోడ్డు పక్కకు తప్పుకుని దారి ఇవ్వాలి",
            "స్థలం లేకపోతే దారి ఇవ్వకూడదు",
            "అంబులెన్స్ వెంటే వెళ్ళాలి"
        ],
        correctIndex: 0,
        category: "Situation",
        language: "Telugu"
    },
    {
        questionText: "కొండ దిగువన వాహనాన్ని పార్క్ చేసినప్పుడు మీరు ఏమి చేయాలి?",
        options: [
            "హ్యాండ్ బ్రేక్ వేసి రివర్స్ గేర్‌లో ఉంచాలి",
            "హ్యాండ్ బ్రేక్ వేసి ఫస్ట్ గేర్‌లో ఉంచాలి",
            "గేర్ వేయకుండా ఉంచాలి"
        ],
        correctIndex: 0,
        category: "Situation",
        language: "Telugu"
    }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        await RTOQuestion.deleteMany({});
        console.log('Cleared existing RTO questions');

        await RTOQuestion.insertMany(questions);
        console.log(`Seeded ${questions.length} RTO questions`);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seed();
