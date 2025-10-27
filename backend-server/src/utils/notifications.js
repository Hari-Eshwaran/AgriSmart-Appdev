const admin = require('firebase-admin');
const { Notification } = require('../models/index');

let fcmInitialized = false;

function tryInitFCM() {
    if (fcmInitialized) return;
    try {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        if (!serviceAccountJson) return;
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        fcmInitialized = true;
        console.log('✅ Firebase admin initialized for push notifications');
    } catch (err) {
        console.warn('⚠️  Firebase admin not initialized:', err.message);
    }
}

const sendEmail = async ({ to, subject, text, html }) => {
    // Placeholder email sender. Configure a real email provider in production (SendGrid, SES, SMTP)
    // For now we log and also create an in-app notification record
    console.log(`✉️  Email to ${to}: ${subject} - ${text || ''}`);
    try {
        await Notification.create({
            user: null, // unknown mapping here; caller may also create Notification record directly
            type: 'email',
            title: subject,
            message: text || html || '',
            data: { emailTo: to }
        });
    } catch (e) {
        // ignore
    }
};

const sendPush = async ({ token, title, body, data = {} }) => {
    tryInitFCM();
    if (!fcmInitialized) {
        console.log(`🔔 Push to ${token}: ${title} - ${body}`);
        return;
    }

    const message = {
        token,
        notification: { title, body },
        data: Object.keys(data).reduce((acc, k) => ({ ...acc, [k]: String(data[k]) }), {})
    };

    try {
        const resp = await admin.messaging().send(message);
        console.log('✅ Push sent:', resp);
        return resp;
    } catch (err) {
        console.error('❌ Push send error:', err.message);
    }
};

module.exports = {
    sendEmail,
    sendPush
};
