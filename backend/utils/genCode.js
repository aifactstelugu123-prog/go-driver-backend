/**
 * Generates a unique 10-character uppercase alphanumeric referral code.
 * If user ID is provided, creates a deterministic code that will never change.
 * Format: [PREFIX][7 hex chars of ID]
 */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function genCode(prefix = '', id = null) {
    if (id) {
        const idStr = id.toString().toUpperCase();
        const start = Math.max(0, idStr.length - (10 - prefix.length));
        return prefix + idStr.substring(start);
    }

    const len = 10 - prefix.length;
    let rand = '';
    for (let i = 0; i < len; i++) {
        rand += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return prefix + rand;
}

module.exports = { genCode };
