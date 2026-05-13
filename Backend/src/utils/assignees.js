export const splitAssignees = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
  }
  return [...new Set(String(value || "").split(",").map((item) => item.trim()).filter(Boolean))];
};

export const formatAssignees = (value, fallback = "N/A") => {
  const names = splitAssignees(value);
  return names.length ? names.join(", ") : fallback;
};
