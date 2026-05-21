export const COMPANY_OPTIONS = ['OAS', 'MLP', 'KPCL', 'A2Z', 'TLPS', 'KPCL BD'];

export const getAssignedCompaniesFromUser = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const assigned = Array.isArray(user?.assignedCompanies) ? user.assignedCompanies : [];
  return assigned.length ? assigned : COMPANY_OPTIONS;
};
