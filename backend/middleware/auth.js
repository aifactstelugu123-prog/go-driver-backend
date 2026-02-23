const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner');
const Driver = require('../models/Driver');

const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role }

        // Attach the actual user object
        if (decoded.role === 'owner') {
            const owner = await Owner.findById(decoded.id).select('-otp -otpExpiry');
            if (!owner) {
                return res.status(401).json({ success: false, message: 'Owner account not found.' });
            }
            req.owner = owner;
        } else if (decoded.role === 'driver') {
            const driver = await Driver.findById(decoded.id).select('-otp -otpExpiry');
            if (!driver || driver.isBlocked) {
                return res.status(401).json({ success: false, message: 'Account not found or blocked.' });
            }
            req.driver = driver;
        }
        // admin has no DB model — credentials are from .env

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid token.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
        }
        res.status(500).json({ success: false, message: 'Auth middleware error.' });
    }
};

module.exports = { protect };
