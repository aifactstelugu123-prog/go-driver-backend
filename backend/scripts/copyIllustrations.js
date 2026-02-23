const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/bsubb/.gemini/antigravity/brain/ac20709f-6946-47fe-95d7-0efb8d5eed91';
const SIGNS_DIR = 'd:/drive act go/frontend/public/signs';

const mapping = {
    'traffic_illustration_pedestrian_crossing_1771809859558.png': 'pedestrianCrossing.png',
    'traffic_illustration_traffic_light_red_1771809878654.png': 'redLight.png',
    'traffic_illustration_accident_report_1771809895668.png': 'accident.png',
    'traffic_illustration_speed_limit_40_1771809909713.png': 'speedLimit.png'
};

// Add ambulance if success
// For now let's copy what we have.

if (!fs.existsSync(SIGNS_DIR)) {
    fs.mkdirSync(SIGNS_DIR, { recursive: true });
}

Object.entries(mapping).forEach(([src, dest]) => {
    const srcPath = path.join(ARTIFACTS_DIR, src);
    const destPath = path.join(SIGNS_DIR, dest);

    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${src} to ${dest}`);
    } else {
        console.error(`Source not found: ${srcPath}`);
    }
});
