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
    design_prepared: {
        type: String
    },
    building_regulations_drawings: {
        type: String
    },
    planning_permission: {
        type: String
    },
    budget: {
        type: String
    },
    final_price: {
        type: String
    },
    when_start: {
        type: String
    },
    file_link: {
        type: String
    },
    property_name: {
        type: String
    },
    in_quote_date: {
        type: String
    },
    quote_file: {
        type: String
    },
    in_servey_date: {
        type: String
    },
    in_design_date: {
        type: String
    },
    in_review_date: {
        type: String
    },
    servey_date: {
        type: String
    },
    close_date: {
        type: String
    },
    cancel_date: {
        type: String
    },
    invoice_sent: {
        type: String
    },
    source: {
        type: String
    },
    source_link: {
        type: String,
        unique: true
    },
    status: {
        type: String
    },
    remark: {
        type: String
    },
}, { timestamps: true })

let Lead = Mongoose.model('Lead', LeadSchema)

module.exports = Lead;