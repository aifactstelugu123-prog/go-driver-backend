const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/bsubb/.gemini/antigravity/brain/ac20709f-6946-47fe-95d7-0efb8d5eed91';
const SIGNS_DIR = path.join(__dirname, '../../frontend/public/signs');

const mapping = {
    'traffic_sign_stop_1771808342990.png': 'stop.png',
    'traffic_sign_give_way_1771808483952.png': 'giveWay.png',
    'traffic_sign_no_entry_1771808499604.png': 'noEntry.png',
    'traffic_sign_no_uturn_1771808516613.png': 'noUTurn.png',
    'traffic_sign_no_overtaking_1771808538069.png': 'noOvertaking.png',
    'traffic_sign_school_ahead_1771808553722.png': 'schoolAhead.png',
    'traffic_sign_men_at_work_1771808572068.png': 'menAtWork.png',
    'traffic_sign_roundabout_1771808587813.png': 'roundabout.png',
    'traffic_sign_one_way_up_1771808610417.png': 'oneWay.png',
    'traffic_sign_right_turn_compulsory_only_arrow_1771808628149.png': 'rightTurn.png',
    'traffic_sign_left_turn_compulsory_only_arrow_1771808642363.png': 'leftTurn.png',
    'traffic_sign_horn_prohibited_sign_diagonal_slash_car_loud_noise_quiet_zone_1771808657871.png': 'hornProhibited.png',
    'traffic_sign_narrow_bridge_warning_triangle_bridge_narrowing_road_sign_indian_roads_rules_1771808674702.png': 'narrowBridge.png'
};

if (!fs.existsSync(SIGNS_DIR)) {
    fs.mkdirSync(SIGNS_DIR, { recursive: true });
}

for (const [src, dest] of Object.entries(mapping)) {
    const srcPath = path.join(ARTIFACTS_DIR, src);
    const destPath = path.join(SIGNS_DIR, dest);

    if (fs.existsSync(srcPath)) {
        console.log(`Copying ${src} to ${dest}...`);
        fs.copyFileSync(srcPath, destPath);
    } else {
        console.warn(`Artifact not found: ${src}`);
    }
}

console.log('All signs copied! 🚦✅');
