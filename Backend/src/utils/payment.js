export const parseMoney = (value) => {
  const numeric = Number(String(value ?? 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

export const resolveLeadDueAmount = (lead) => {
  const quoted = parseMoney(lead?.quote_price);
  const storedDue = parseMoney(lead?.payment_due_amount);

  const activeCycle = Number(lead?.payment_cycle || 1);
  const cycleHistory = Array.isArray(lead?.payment_history)
    ? lead.payment_history.filter((item) => Number(item?.cycle || 1) === activeCycle)
    : [];

  const historyReceived = cycleHistory.reduce((sum, item) => sum + parseMoney(item?.paid_amount), 0);
  const historyDiscount = cycleHistory.reduce((sum, item) => sum + parseMoney(item?.discount_given), 0);

  const hasCycleHistory = cycleHistory.length > 0;
  const received = hasCycleHistory ? historyReceived : parseMoney(lead?.payment_received_total);
  const discount = hasCycleHistory ? historyDiscount : parseMoney(lead?.payment_discount_total);
  const computedDue = Math.max(quoted - (received + discount), 0);

  return storedDue > 0 ? storedDue : computedDue;
};
