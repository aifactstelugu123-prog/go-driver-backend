const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MAX_SIZE_BYTES = 200 * 1024; // 200 KB

// Ensure upload directories exist
const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
ensureDir(path.join(__dirname, '../uploads/drivers'));
ensureDir(path.join(__dirname, '../uploads/owners'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const role = req.user?.role || 'unknown';
        const dir = path.join(__dirname, `../uploads/${role}s`);
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const userId = req.user?.id || 'unknown';
        const docType = file.fieldname;
        const ts = Date.now();
        cb(null, `${userId}_${docType}_${ts}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
        return cb(new Error('Only JPG, PNG, PDF files are allowed.'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_SIZE_BYTES },
});

// Error handler to return clean JSON on multer errors
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File too large. Maximum size is 200 KB per file.' });
        }
        return res.status(400).json({ success: false, message: err.message });
    }
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
};

module.exports = { upload, handleUploadError };
