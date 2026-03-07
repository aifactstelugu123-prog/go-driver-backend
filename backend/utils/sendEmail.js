const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Determine user and pass based on environment or fallback
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        process.stdout.write("\n⚠️ [EMAIL SYSTEM] MOCK MODE ACTIVE: EMAIL_USER/PASS MISSING\n");
        console.warn("⚠️ Nodemailer is running in 'Mock Mode'. Email will NOT be sent.");
        console.log(`📩 MOCK EMAIL: To: ${options.email} | Subject: ${options.subject}`);
        console.log(`📩 MOCK EMAIL BODY: \n${options.message}\n`);
        return;
    }

    console.log(`[EMAIL] Attempting to send to: ${options.email} via port 587 (STARTTLS)`);

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for 587
        auth: {
            user: user,
            pass: pass
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000
    });

    const mailOptions = {
        from: `"DaaS Platform" <${user}>`,
        to: options.email,
        subject: options.subject,
        html: options.message
    };

    console.log(`[EMAIL] Sending...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Success! Message ID: ${info.messageId}`);
};

module.exports = sendEmail;
