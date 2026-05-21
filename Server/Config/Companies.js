const COMPANY_OPTIONS = Object.freeze(['OAS', 'MLP', 'KPCL', 'A2Z', 'TLPS', 'KPCL BD']);

const normalizeCompanyName = (value) => String(value || '').trim();

const isValidCompany = (value) => COMPANY_OPTIONS.includes(normalizeCompanyName(value));

const sanitizeAssignedCompanies = (value) => {
    const raw = Array.isArray(value) ? value : (value ? [value] : []);
    const unique = [...new Set(raw.map(normalizeCompanyName).filter(Boolean))];
    return unique.filter(isValidCompany);
};

module.exports = {
    COMPANY_OPTIONS,
    isValidCompany,
    sanitizeAssignedCompanies,
    normalizeCompanyName,
};
