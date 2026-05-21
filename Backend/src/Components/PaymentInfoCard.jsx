import { formatCurrencyGBP, formatLondonDateTime } from '../utils/formatters';

export default function PaymentInfoCard({ viewData }) {
  const userType = JSON.parse(localStorage.getItem('user') || '{}')?.userType;
  const canView = userType === 'Admin' || userType === 'Management';

  if (!canView) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mt-4">
      <h3 className="text-base font-semibold text-slate-800 mb-3">Payment Details</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5 mb-4">
        <Item label="Quoted" value={formatCurrencyGBP(viewData?.quote_price || 0)} />
        <Item label="Received" value={formatCurrencyGBP(viewData?.payment_received_total || 0)} />
        <Item label="Discount" value={formatCurrencyGBP(viewData?.payment_discount_total || 0)} />
        <Item label="Due" value={formatCurrencyGBP(viewData?.payment_due_amount || 0)} />
      </div>

      <div className="mb-2">
        <p className="text-sm font-medium text-slate-700">Payment History</p>
      </div>

      <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr>
              <th className="text-left p-2.5 font-semibold text-slate-700">Date</th>
              <th className="text-left p-2.5 font-semibold text-slate-700">Agent</th>
              <th className="text-left p-2.5 font-semibold text-slate-700">Amount</th>
              <th className="text-left p-2.5 font-semibold text-slate-700">Discount</th>
              <th className="text-left p-2.5 font-semibold text-slate-700">Note</th>
            </tr>
          </thead>
          <tbody>
            {(viewData?.payment_history || []).map((item) => (
              <tr key={item._id} className="border-t border-slate-200 hover:bg-slate-50/70">
                <td className="p-2.5 text-slate-700">{formatLondonDateTime(item.paid_at)}</td>
                <td className="p-2.5 text-slate-700">{item.agent || '-'}</td>
                <td className="p-2.5 text-slate-700">{formatCurrencyGBP(item.paid_amount)}</td>
                <td className="p-2.5 text-slate-700">{formatCurrencyGBP(item.discount_given)}</td>
                <td className="p-2.5 text-slate-700">{item.note || '-'}</td>
              </tr>
            ))}
            {!(viewData?.payment_history || []).length && (
              <tr><td className="p-4 text-slate-500 text-center" colSpan={5}>No payment history found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Item({ label, value }) {
  return <div className="rounded-md border border-slate-200 bg-white p-2.5"><p className="text-xs text-slate-500">{label}</p><p className="font-semibold text-slate-800">{value}</p></div>;
}
