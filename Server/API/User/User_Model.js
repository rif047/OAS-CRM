const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        sparse: true
    },
    userType: {
        type: String,
        required: true,
    },
    designation: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    secret_code: {
        type: String,
        required: true
    },
    description: String

}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

module.exports = User;
