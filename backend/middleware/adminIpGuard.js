/**
 * Admin IP Whitelist Middleware
 * Blocks admin route access from non-whitelisted IPs.
 * Whitelist is set in .env: ADMIN_IP_WHITELIST=127.0.0.1,::1,your.home.ip
 */
const adminIpGuard = (req, res, next) => {
    const whitelist = (process.env.ADMIN_IP_WHITELIST || '127.0.0.1,::1,::ffff:127.0.0.1')
        .split(',').map(ip => ip.trim());

    // Get real IP (works behind proxies/nginx)
    const clientIp =
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        '';

    const isLan = clientIp.startsWith('192.168.');
    if (!whitelist.includes(clientIp) && !isLan) {
        console.warn(`[ADMIN IP BLOCKED] Attempt from: ${clientIp}`);
        // Return 404 (not 403) — don't reveal that admin exists
        return res.status(404).json({ success: false, message: 'Not found.' });
    }

    next();
};

module.exports = { adminIpGuard };
