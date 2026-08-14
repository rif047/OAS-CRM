const User = require('../API/User/User_Model');
const { COMPANY_OPTIONS, sanitizeAssignedCompanies, normalizeCompanyName } = require('../Config/Companies');

const resolveAssignedCompaniesForRequest = async (req) => {
    if (req.userType === 'Admin' || req.userType === 'Surveyor') {
        return [...COMPANY_OPTIONS];
    }

    if (!req.userId || String(req.userId) === 'builtin-admin') {
        return [];
    }

    // Always prefer the latest DB assignment for non-admin users.
    // This prevents stale token data from exposing outdated company scope.
    const user = await User.findById(req.userId).select('assignedCompanies').lean();
    const assigned = sanitizeAssignedCompanies(user?.assignedCompanies || []);

    // Non-admin must always be controlled by DB assignment.
    // If empty, return empty scope (no company access) instead of broad fallback.
    if (!assigned.length) return [];

    return assigned;
};

const buildCompanyMatch = (fieldName, allowedCompanies) => ({ [fieldName]: { $in: allowedCompanies } });

const enforceCompanyInAllowedList = (company, allowedCompanies) => {
    const normalized = normalizeCompanyName(company);
    return allowedCompanies.includes(normalized) ? normalized : null;
};

module.exports = {
    resolveAssignedCompaniesForRequest,
    buildCompanyMatch,
    enforceCompanyInAllowedList,
};
