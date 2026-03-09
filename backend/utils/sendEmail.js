const { Resend } = require('resend');

const sendEmail = async (options) => {
    // We expect the standard RESEND_API_KEY environment variable
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
        process.stdout.write("\n⚠️ [EMAIL SYSTEM] MOCK MODE ACTIVE: RESEND_API_KEY MISSING\n");
        console.warn("⚠️ Resend is running in 'Mock Mode'. Email will NOT be sent.");
        console.log(`📩 MOCK EMAIL: To: ${options.email} | Subject: ${options.subject}`);
        console.log(`📩 MOCK EMAIL BODY: \n${options.message}\n`);
        return;
    }

    const resend = new Resend(resendApiKey);

    try {
        console.log(`[EMAIL] Attempting to send using Resend API to: ${options.email}`);

        const data = await resend.emails.send({
            from: 'DaaS Platform <onboarding@resend.dev>', // Resend free tier strict requirement
            to: options.email,
            subject: options.subject,
            html: options.message
        });

        if (data.error) {
            console.error('[RESEND API ERROR]', data.error);
            throw new Error(data.error.message);
        }

        console.log(`[EMAIL] Success! Message ID: ${data.data?.id}`);
    } catch (err) {
        console.error('[EMAIL SEND ERROR]', err);
        throw err; // Let it bubble up to the route handler
    }
};

module.exports = sendEmail;
