const nodemailer = require('nodemailer');
const dns = require('dns');

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

    console.log(`[EMAIL] Attempting to send to: ${options.email} via port 587 (IPv4 FORCED)`);

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        // STRICTLY FORCE IPv4 using custom lookup
        lookup: (hostname, options, callback) => {
            dns.lookup(hostname, { family: 4 }, callback);
        },
        auth: {
            user: user,
            pass: pass
        },
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 30000,
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
