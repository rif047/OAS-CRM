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
    property_type: {
        type: String
    },
    extention_type: {
        type: String
    },
    project_type: {
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
    lead_status: {
        type: String
    },
    description: {
        type: String
    },
}, { timestamps: true })

let Lead = Mongoose.model('Lead', LeadSchema)

module.exports = Lead;