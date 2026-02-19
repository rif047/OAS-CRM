const jwt = require("jsonwebtoken");

const Check_Login = (req, res, next) => {
    const { authorization } = req.headers;

    if (!authorization || !authorization.startsWith("Bearer ")) { return res.status(401).json({ error: "Unauthorized access!" }); }

    const token = authorization.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userType = decoded.userType;
        req.username = decoded.username;
        next();
    } catch (err) {
        console.log("Token verification failed:", err?.message || err);
        return res.status(401).json({ error: "Authentication failed!" });
    }
};

module.exports = Check_Login;
