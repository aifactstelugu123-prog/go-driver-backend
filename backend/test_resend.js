require('dotenv').config();
const sendEmail = require('./utils/sendEmail');

async function testResend() {
    try {
        console.log("Starting test email...");
        await sendEmail({
            email: 'b.subbaraju40155@gmail.com',
            subject: 'Test Resend API',
            message: '<h1>Hello from Resend!</h1><p>This is a test to verify the new email configuration.</p>'
        });
        console.log("Test finished successfully.");
    } catch (error) {
        console.error("Test failed:", error);
    }
}

testResend();
