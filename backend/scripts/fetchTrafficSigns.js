const fs = require('fs');
const path = require('path');
const axios = require('axios');

const SIGNS_DIR = path.join(__dirname, '../../frontend/public/signs');

const signs = [
    { name: 'stop', h: 'India_Road_Sign_-_Stop.svg' },
    { name: 'giveWay', h: 'India_Road_Sign_-_Give_Way.svg' },
    { name: 'noEntry', h: 'India_Road_Sign_-_No_Entry.svg' },
    { name: 'noUTurn', h: 'India_Road_Sign_-_No_U-turn.svg' },
    { name: 'noOvertaking', h: 'India_Road_Sign_-_No_Overtaking.svg' },
    { name: 'narrowBridge', h: 'India_Road_Sign_-_Narrow_Bridge.svg' },
    { name: 'schoolAhead', h: 'India_Road_Sign_-_School_Ahead.svg' },
    { name: 'menAtWork', h: 'India_Road_Sign_-_Men_at_work.svg' },
    { name: 'roundabout', h: 'India_Road_Sign_-_Roundabout.svg' },
    { name: 'oneWay', h: 'India_Road_Sign_-_One_Way.svg' },
    { name: 'rightTurn', h: 'India_Road_Sign_-_Compulsory_Right_Turn.svg' },
    { name: 'leftTurn', h: 'India_Road_Sign_-_Compulsory_Left_Turn.svg' },
    { name: 'hornProhibited', h: 'India_Road_Sign_-_Horn_Prohibited.svg' }
];

async function downloadSign(name, fileName) {
    // Special:FilePath works better on Commons for these files
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${fileName}`;
    const filePath = path.join(SIGNS_DIR, `${name}.svg`);

    try {
        console.log(`Downloading ${name} from ${url}...`);
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (err) {
        console.error(`Failed to download ${name}:`, err.message);
    }
}

async function run() {
    if (!fs.existsSync(SIGNS_DIR)) {
        fs.mkdirSync(SIGNS_DIR, { recursive: true });
    }

    for (const s of signs) {
        await downloadSign(s.name, s.h);
    }
    console.log('Finished downloading traffic signs! 🚦');
}

run();
