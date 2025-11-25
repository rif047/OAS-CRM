const Route = require("express").Router();
const User = require("../User/User_Model");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

Route.post("/", async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                username: user.username,
                userType: user.userType,
                name: user.name,
                phone: user.phone,
                email: user.email,
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                userType: user.userType,
                name: user.name,
                phone: user.phone,
                email: user.email,
            },
            message: "Login successful!"
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Authentication failed!' });
    }
});

module.exports = Route;
