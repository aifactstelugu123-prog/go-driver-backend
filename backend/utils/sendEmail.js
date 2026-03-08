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
        secure: false, // false for 587
        family: 4,     // CRITICAL: Force IPv4 at the socket level
        auth: {
            user: user,
            pass: pass
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        requireTLS: true,
        tls: {
            servername: 'smtp.gmail.com',
            rejectUnauthorized: false
        }
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
