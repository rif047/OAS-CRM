const Route = require("express").Router();
const User = require("../User/User_Model");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const { authenticateBuiltinAdmin } = require("../../Config/Builtin_Admin");

Route.post("/", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'Server authentication is not configured' });
        }

        const normalizedUsername = username.toLowerCase();
        const builtinAdmin = await authenticateBuiltinAdmin({ username: normalizedUsername, password });
        if (builtinAdmin) {
            const token = jwt.sign(
                {
                    userId: builtinAdmin._id,
                    username: builtinAdmin.username,
                    userType: builtinAdmin.userType,
                    name: builtinAdmin.name,
                    phone: builtinAdmin.phone,
                    email: builtinAdmin.email,
                },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            return res.status(200).json({
                token,
                user: {
                    id: builtinAdmin.id,
                    username: builtinAdmin.username,
                    userType: builtinAdmin.userType,
                    name: builtinAdmin.name,
                    phone: builtinAdmin.phone,
                    email: builtinAdmin.email,
                },
                message: "Login successful!"
            });
        }

        const user = await User.findOne({ username: normalizedUsername });
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
