require('dotenv').config();
const sendEmail = require('./utils/sendEmail');

async function testEmail() {
    console.log('--- Email Testing ---');
    console.log('User:', process.env.EMAIL_USER);
    console.log('Pass Length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);

    try {
        await sendEmail({
            email: process.env.EMAIL_USER,
            subject: 'DaaS Email Test',
            message: 'If you are reading this, your Gmail SMTP configuration is WORKING! ✅'
        });
        console.log('✅ Test email sent successfully! Please check your inbox.');
    } catch (err) {
        console.error('❌ Email Failed:', err);
    }
}

testEmail();
