const nodemailer = require('nodemailer');
const dns = require('dns');

const sendEmail = async (options) => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        process.stdout.write("\n⚠️ [EMAIL SYSTEM] MOCK MODE ACTIVE: EMAIL_USER/PASS MISSING\n");
        console.warn("⚠️ Nodemailer is running in 'Mock Mode'. Email will NOT be sent.");
        console.log(`📩 MOCK EMAIL: To: ${options.email} | Subject: ${options.subject}`);
        console.log(`📩 MOCK EMAIL BODY: \n${options.message}\n`);
        return;
    }

    try {
        // Manually resolve to IPv4 to avoid IPv6/ENETUNREACH issues
        const ip = await new Promise((resolve) => {
            dns.lookup('smtp.gmail.com', { family: 4 }, (err, address) => {
                resolve(address || '74.125.142.108'); // Gmail SMTP fallback IP
            });
        });

        console.log(`[EMAIL] Resolved smtp.gmail.com to IPv4: ${ip}`);
        console.log(`[EMAIL] Attempting to send to: ${options.email} via Port 465`);

        const transporter = nodemailer.createTransport({
            host: ip,
            port: 465,
            secure: true, // Port 465 uses SSL
            auth: {
                user: user,
                pass: pass
            },
            tls: {
                servername: 'smtp.gmail.com', // Crucial: tell server it's gmail even if we use IP
                rejectUnauthorized: false
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000
        });

        const mailOptions = {
            from: `"DaaS Platform" <${user}>`,
            to: options.email,
            subject: options.subject,
            html: options.message
        };

        console.log(`[EMAIL] Sending payload...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Success! Message ID: ${info.messageId}`);
    } catch (err) {
        console.error('[EMAIL SEND ERROR]', err);
        throw err; // Let it bubble up to the route handler
    }
};

module.exports = sendEmail;
