const Mongoose = require('mongoose');
const { COMPANY_OPTIONS } = require('../../Config/Companies');

const ProfessionalSchema = Mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    agent: {
        type: String,
        required: true,
        trim: true,
    },
    phone: {
        type: String,
        trim: true,
        default: undefined,
    },
    alt_phone: {
        type: String,
        trim: true,
        default: undefined,
    },
    company: {
        type: String,
        trim: true,
        default: undefined,
    },
    address: {
        type: String,
        trim: true,
        default: undefined,
    },
    access_company: {
        type: String,
        enum: COMPANY_OPTIONS,
        default: undefined,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: undefined,
    },
    sector: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    is_client: {
        type: Boolean,
        default: false,
    },
    client: {
        type: Mongoose.Types.ObjectId,
        ref: 'Client',
        default: undefined,
    },
    converted_at: {
        type: Date,
        default: undefined,
    },
    converted_by: {
        type: Mongoose.Types.ObjectId,
        ref: 'User',
        default: undefined,
    },
    converted_by_name: {
        type: String,
        default: undefined,
    },
}, { timestamps: true, optimisticConcurrency: true });

ProfessionalSchema.index({ createdAt: -1 });
ProfessionalSchema.index({ name: 1 });
ProfessionalSchema.index({ company: 1 });
ProfessionalSchema.index({ address: 1 });
ProfessionalSchema.index({ access_company: 1 });
ProfessionalSchema.index({ sector: 1 });
ProfessionalSchema.index({ is_client: 1 });

ProfessionalSchema.index(
    { phone: 1 },
    { unique: true, partialFilterExpression: { phone: { $gt: '' } } }
);

ProfessionalSchema.index(
    { email: 1 },
    { unique: true, partialFilterExpression: { email: { $gt: '' } } }
);

let Professional = Mongoose.model('Professional', ProfessionalSchema);

Mongoose.connection.once('open', async () => {
    try {
        await Professional.syncIndexes();
    } catch (error) {
        console.error('Professional index sync failed:', error?.message || error);
    }
});

module.exports = Professional;
