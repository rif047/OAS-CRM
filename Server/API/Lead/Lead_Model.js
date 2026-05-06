const Mongoose = require('mongoose');



const LeadSchema = Mongoose.Schema({
    client: {
        type: Mongoose.Types.ObjectId,
        ref: 'Client',
    },
    agent: {
        type: String
    },
    leadCode: {
        type: String,
        required: true,
        unique: true
    },
    address: {
        type: String
    },
    company: {
        type: String
    },
    service_type: {
        type: String
    },
    project_details: {
        type: String
    },
    project_type: {
        type: String
    },
    planning_permission: {
        type: String
    },
    structural_services: {
        type: String
    },
    interior_design: {
        type: String
    },
    building_regulation: {
        type: String
    },
    select_builder: {
        type: String
    },
    help_project_management: {
        type: String
    },
    budget: {
        type: String
    },
    quote_price: {
        type: String
    },
    final_price: {
        type: String
    },
    when_to_start: {
        type: String
    },
    file_link: {
        type: String
    },
    in_quote_date: {
        type: String
    },
    quote_file: {
        type: String
    },
    in_survey_date: {
        type: String
    },
    survey_date: {
        type: String
    },
    surveyor: {
        type: String
    },
    survey_note: {
        type: String
    },
    survey_done: {
        type: String
    },
    survey_file: {
        type: String
    },
    in_design_date: {
        type: String
    },
    design_deadline: {
        type: String
    },
    designer: {
        type: String
    },
    design_file: {
        type: String
    },
    in_review_date: {
        type: String
    },
    close_date: {
        type: String
    },
    lost_date: {
        type: String
    },
    source: {
        type: String
    },
    status: {
        type: String
    },
    stage: {
        type: String
    },
    lead_status: {
        type: String
    },
    description: {
        type: String
    },
    payment_received_total: {
        type: Number,
        default: 0
    },
    payment_discount_total: {
        type: Number,
        default: 0
    },
    payment_due_amount: {
        type: Number,
        default: 0
    },
    payment_cycle: {
        type: Number,
        default: 1
    },
    payment_history: [{
        paid_amount: { type: Number, default: 0 },
        discount_given: { type: Number, default: 0 },
        note: { type: String, default: '' },
        paid_at: { type: Date, default: Date.now },
        agent: { type: String, default: '' },
        stage: { type: String, default: '' },
        cycle: { type: Number, default: 1 },
    }],
}, { timestamps: true })

LeadSchema.index({ status: 1, company: 1, createdAt: -1 });
LeadSchema.index({ company: 1 });
LeadSchema.index({ status: 1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ status: 1, in_quote_date: -1, updatedAt: -1, createdAt: -1 });
LeadSchema.index({ status: 1, in_survey_date: -1, updatedAt: -1, createdAt: -1 });
LeadSchema.index({ status: 1, in_design_date: -1, updatedAt: -1, createdAt: -1 });
LeadSchema.index({ status: 1, in_review_date: -1, updatedAt: -1, createdAt: -1 });
LeadSchema.index({ status: 1, close_date: -1, updatedAt: -1, createdAt: -1 });
LeadSchema.index({ status: 1, lost_date: -1, updatedAt: -1, createdAt: -1 });
LeadSchema.index({ client: 1 });
LeadSchema.index({ stage: 1 });

let Lead = Mongoose.model('Lead', LeadSchema)

module.exports = Lead;
