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
        type: String,
        trim: true,
        default: undefined
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: undefined
    },
    company: {
        type: String
    },
    alt_phone: {
        type: String,
        trim: true
    },
    description: {
        type: String,
    },

}, { timestamps: true })

ClientSchema.index({ createdAt: -1 });

ClientSchema.index(
    { phone: 1 },
    { unique: true, partialFilterExpression: { phone: { $gt: '' } } }
);

ClientSchema.index(
    { email: 1 },
    { unique: true, partialFilterExpression: { email: { $gt: '' } } }
);

let Client = Mongoose.model('Client', ClientSchema)

Mongoose.connection.once('open', async () => {
    try {
        await Client.syncIndexes();
    } catch (error) {
        console.error('Client index sync failed:', error?.message || error);
    }
});

module.exports = Client;
