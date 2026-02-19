const authorize = (...allowedRoles) => (req, res, next) => {
    if (!req.userType) {
        return res.status(401).json({ error: "Unauthorized access!" });
    }

    if (allowedRoles.length && !allowedRoles.includes(req.userType)) {
        return res.status(403).json({ error: "Forbidden" });
    }

    next();
};

module.exports = authorize;
