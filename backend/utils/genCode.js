/**
 * Generates a unique 10-character uppercase alphanumeric referral code.
 * Format: [PREFIX][7 random chars]
 * Examples: DRV4KX9WMN2, OWN7ZPQ3RK1
 */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function genCode(prefix = '') {
    const len = 10 - prefix.length;
    let rand = '';
    for (let i = 0; i < len; i++) {
        rand += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return prefix + rand;
}

module.exports = { genCode };
