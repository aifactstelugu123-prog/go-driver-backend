// Role-based access control middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access forbidden. Required role(s): ${roles.join(', ')}`,
            });
        }
        next();
    };
};

module.exports = { authorize };
