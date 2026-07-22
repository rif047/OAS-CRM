export const getLeadCreatedByName = (lead) => {
  const createdBy = lead?.createdBy;

  if (createdBy && typeof createdBy === 'object') {
    return createdBy.name || createdBy.username || '';
  }

  if (typeof createdBy === 'string') return '';

  return lead?.agent || '';
};
