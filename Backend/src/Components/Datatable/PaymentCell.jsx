const parseMoney = (value) => {
  const numeric = Number(String(value ?? 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const shortMoney = (value) => {
  const amount = parseMoney(value);
  const abs = Math.abs(amount);

  if (abs >= 1000000) return `£${(amount / 1000000).toFixed(1).replace(/\.0$/, "")}m`;
  if (abs >= 1000) return `£${(amount / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `£${Math.round(amount)}`;
};

const getPaymentSummary = (lead) => {
  const quoted = parseMoney(lead?.quote_price);
  const receivedTotal = lead?.payment_received_total;
  const dueTotal = lead?.payment_due_amount;

  const history = Array.isArray(lead?.payment_history) ? lead.payment_history : [];
  const historyReceived = history.reduce((sum, item) => sum + parseMoney(item?.paid_amount), 0);
  const historyDiscount = history.reduce((sum, item) => sum + parseMoney(item?.discount_given), 0);

  const received = parseMoney(
    receivedTotal !== undefined && receivedTotal !== null ? receivedTotal : historyReceived
  );
  const due = parseMoney(
    dueTotal !== undefined && dueTotal !== null
      ? dueTotal
      : Math.max(quoted - (received + historyDiscount), 0)
  );

  return { quoted, received, due };
};

export default function PaymentCell({ lead, onClick, showSummary = false }) {
  const { quoted, received, due } = getPaymentSummary(lead);

  return (
    <div className="crmPaymentCellWrap">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(lead);
        }}
        className="crmPaymentBtn"
      >
        Ledger
      </button>
      {showSummary && (
        <div className="crmPaymentMeta" title={`Quoted: ${quoted}, Received: ${received}, Due: ${due}`}>
          <span><b>Q</b> {shortMoney(quoted)}</span>
          <span><b>R</b> {shortMoney(received)}</span>
          <span><b>D</b> {shortMoney(due)}</span>
        </div>
      )}
    </div>
  );
}
