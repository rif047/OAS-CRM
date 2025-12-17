const Mongoose = require('mongoose');


const ClientSchema = Mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    agent: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true,
        unique: true
    },
    email: {
        type: String
    },
    company: {
        type: String
    },
    alt_phone: {
        type: Number
    },
    description: {
        type: String,
    },

}, { timestamps: true })

let Client = Mongoose.model('Client', ClientSchema)

module.exports = Client;