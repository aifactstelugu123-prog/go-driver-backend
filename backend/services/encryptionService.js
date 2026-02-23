const crypto = require('crypto');

const ALGO = 'aes-256-cbc';
// Use ENCRYPTION_KEY from env, or fallback to JWT_SECRET if not set (temporary)
const ENC_KEY = Buffer.from(
    (process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'defaultsecret32charslong!!!!!!!!').padEnd(32, '0').slice(0, 32)
);

/**
 * Encrypt text using AES-256-CBC
 */
const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGO, ENC_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

/**
 * Decrypt text using AES-256-CBC
 */
const decrypt = (enc) => {
    if (!enc || !enc.includes(':')) return null;
    try {
        const [ivHex, dataHex] = enc.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGO, ENC_KEY, iv);
        return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
    } catch (err) {
        console.error('Decryption failed:', err.message);
        return null;
    }
};

/**
 * Mask sensitive strings (e.g., account numbers)
 */
const maskData = (data, visibleCount = 4) => {
    if (!data) return '';
    return '*'.repeat(Math.max(0, data.length - visibleCount)) + data.slice(-visibleCount);
};

module.exports = {
    encrypt,
    decrypt,
    maskData
};
