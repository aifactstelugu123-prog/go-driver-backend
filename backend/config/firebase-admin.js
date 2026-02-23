const admin = require('firebase-admin');

// ⚠️ IMPORTANT: To use Firebase Auth, you must generate a Service Account Key
// from the Firebase Console (Settings > Service Accounts > Generate New Private Key)
// and save it as `serviceAccountKey.json` in the backend root directory.

let firebaseApp = null;

try {
    let serviceAccount;

    // Check for environment variable first (Production/Render)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
        // Fallback to local file (Local Development)
        serviceAccount = require('../../serviceAccountKey.json');
    }

    firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin Initialized Successfully');
} catch (error) {
    console.error('⚠️ Firebase Admin Initialization Failed:', error.message);
    console.error('⚠️ For local dev, ensure serviceAccountKey.json exists. For production, set FIREBASE_SERVICE_ACCOUNT env var.');
}

module.exports = { admin, firebaseApp };
