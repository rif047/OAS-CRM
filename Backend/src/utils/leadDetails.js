import axios from "axios";

const DETAIL_FIELDS = ["description", "payment_history", "project_details", "survey_note"];

export const hasLeadDetailPayload = (lead) => {
    if (!lead || typeof lead !== "object") return false;
    return DETAIL_FIELDS.every((field) => Object.prototype.hasOwnProperty.call(lead, field));
};

export const fetchLeadDetailById = async (leadId) => {
    if (!leadId) throw new Error("Lead id is required");
    const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/leads/${leadId}`);
    return res.data;
};

export const ensureLeadDetail = async (lead) => {
    if (!lead || !lead._id) return lead;
    if (hasLeadDetailPayload(lead)) return lead;
    return fetchLeadDetailById(lead._id);
};
