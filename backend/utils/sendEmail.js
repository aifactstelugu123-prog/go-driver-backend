const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Determine user and pass based on environment or fallback
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        console.warn("\n⚠️ WARNING: EMAIL_USER or EMAIL_PASS not set in .env!");
        console.warn("⚠️ Nodemailer is running in 'Mock Mode'. Email will NOT be sent.");
        console.log(`📩 MOCK EMAIL: To: ${options.email} | Subject: ${options.subject}`);
        console.log(`📩 MOCK EMAIL BODY: \n${options.message}\n`);
        return; // Skip actual sending if credentials aren't provided yet
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass
        }
    });

    const mailOptions = {
        from: `DaaS Platform <${user}>`,
        to: options.email,
        subject: options.subject,
        html: options.message
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Message sent: %s`, info.messageId);
};

module.exports = sendEmail;
