import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField, InputAdornment } from '@mui/material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { formatCurrencyGBP, formatLondonDateTime } from '../utils/formatters';
import { markEditedRowForHighlight } from '../utils/datatableState';

const parseMoney = (value) => {
  const numeric = Number(String(value ?? 0).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
};

export default function LeadPaymentModal({ open, onClose, lead, onUpdated }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [form, setForm] = useState({ amount: '', discount_given: '', note: '', paid_at: '' });
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [localLead, setLocalLead] = useState(lead);

  useEffect(() => setLocalLead(lead), [lead]);

  const quoted = useMemo(() => parseMoney(localLead?.quote_price), [localLead?.quote_price]);
  const received = useMemo(() => parseMoney(localLead?.payment_received_total), [localLead?.payment_received_total]);
  const discount = useMemo(() => parseMoney(localLead?.payment_discount_total), [localLead?.payment_discount_total]);
  const due = useMemo(() => Math.max(quoted - (received + discount), 0), [quoted, received, discount]);
  const history = localLead?.payment_history || [];

  const resetForm = () => {
    setForm({ amount: '', discount_given: '', note: '', paid_at: '' });
    setEditingId('');
  };

  const submit = async () => {
    const amount = parseMoney(form.amount);
    const dis = parseMoney(form.discount_given);

    if (amount < 0 || dis < 0) return toast.error('Amount/discount invalid.');
    if (!editingId && amount === 0 && dis === 0 && !String(form.note || '').trim()) {
      return toast.error('Please provide payment amount, discount, or note.');
    }

    setLoading(true);
    try {
      const url = editingId
        ? `${import.meta.env.VITE_SERVER_URL}/api/leads/payments/${localLead._id}/${editingId}`
        : `${import.meta.env.VITE_SERVER_URL}/api/leads/payments/${localLead._id}`;
      const method = editingId ? 'patch' : 'post';

      const res = await axios[method](url, {
        amount,
        discount_given: dis,
        note: form.note,
        paid_at: form.paid_at || undefined,
        agent: user?.name || localLead?.agent || 'System',
      });

      setLocalLead(res.data);
      markEditedRowForHighlight(localLead?._id || res.data?._id);
      onUpdated?.(res.data);
      resetForm();
      toast.success(editingId ? 'Payment updated.' : 'Payment added.');
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data || 'Payment save failed.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      amount: item.paid_amount ?? 0,
      discount_given: item.discount_given ?? 0,
      note: item.note || '',
      paid_at: item.paid_at ? new Date(item.paid_at).toISOString().slice(0, 10) : '',
    });
  };

  const openDatePicker = (event) => {
    const input = event.currentTarget.querySelector('input[type="date"]');
    if (!input) return;
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }
    } catch {
      // Ignore and fallback to focus/click.
    }
    input.focus();
    input.click();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 4,
          width: '100%',
          m: { xs: 1, sm: 2 },
          maxHeight: { xs: '92vh', sm: '88vh' },
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.22)',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 800, color: '#0f172a' }}>
        <b>Payment - {localLead?.leadCode || ''}</b>
      </DialogTitle>
      <DialogContent sx={{ overflowX: 'hidden', pb: 2, px: { xs: 2, sm: 3 }, '&::-webkit-scrollbar': { width: 0, height: 0 } }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 rounded-xl border border-slate-200/90 bg-slate-100 p-2.5 md:p-3 mb-4 shadow-sm">
          <Summary title="Quoted" value={formatCurrencyGBP(quoted)} />
          <Summary title="Received" value={formatCurrencyGBP(received)} />
          <Summary title="Discount" value={formatCurrencyGBP(discount)} />
          <Summary title="Due" value={formatCurrencyGBP(due)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Payment Date"
            InputLabelProps={{ shrink: true }}
            value={form.paid_at}
            onChange={(e) => setForm((p) => ({ ...p, paid_at: e.target.value }))}
            onClick={openDatePicker}
            sx={dateFieldSx}
          />
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Receive Amount"
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            sx={premiumFieldSx}
            InputProps={{
              startAdornment: <InputAdornment position="start">£</InputAdornment>,
            }}
          />
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Discount Given"
            value={form.discount_given}
            onChange={(e) => setForm((p) => ({ ...p, discount_given: e.target.value }))}
            sx={premiumFieldSx}
            InputProps={{
              startAdornment: <InputAdornment position="start">£</InputAdornment>,
            }}
          />
        </div>
        <TextField
          size="small"
          fullWidth
          multiline
          minRows={3}
          label="Payment Note"
          value={form.note}
          onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
          sx={{ ...premiumFieldSx, mt: 2.5 }}
        />

        <div className="mt-4">
          <h4 className="font-semibold text-slate-800 mb-2">Payment History</h4>
          <div className="hidden md:block max-h-64 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-100/90">
                <tr>
                  <th className="text-left p-2.5">Date</th>
                  <th className="text-left p-2.5">Agent</th>
                  <th className="text-left p-2.5">Amount</th>
                  <th className="text-left p-2.5">Discount</th>
                  <th className="text-left p-2.5">Due</th>
                  <th className="text-left p-2.5">Note</th>
                  <th className="text-left p-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item._id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="p-2.5 whitespace-nowrap">{formatLondonDateTime(item.paid_at)}</td>
                    <td className="p-2.5">{item.agent || '-'}</td>
                    <td className="p-2.5 whitespace-nowrap font-medium">{formatCurrencyGBP(item.paid_amount)}</td>
                    <td className="p-2.5 whitespace-nowrap">{formatCurrencyGBP(item.discount_given)}</td>
                    <td className="p-2.5 whitespace-nowrap text-amber-700">{formatCurrencyGBP(localLead?.payment_due_amount || 0)}</td>
                    <td className="p-2.5 wrap-break-word">{item.note || '-'}</td>
                    <td className="p-2.5">
                      <button type="button" className="text-blue-700 text-xs font-semibold cursor-pointer whitespace-nowrap hover:text-blue-900" onClick={() => startEdit(item)}>Edit</button>
                    </td>
                  </tr>
                ))}
                {!history.length && (
                  <tr><td className="p-3 text-slate-500" colSpan={7}>No payment history.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {history.map((item) => (
              <div key={item._id} className="rounded-xl border border-slate-200 p-3 bg-white shadow-sm">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <HistoryItem label="Date" value={formatLondonDateTime(item.paid_at)} />
                  <HistoryItem label="Agent" value={item.agent || '-'} />
                  <HistoryItem label="Amount" value={formatCurrencyGBP(item.paid_amount)} />
                  <HistoryItem label="Discount" value={formatCurrencyGBP(item.discount_given)} />
                  <HistoryItem label="Due" value={formatCurrencyGBP(localLead?.payment_due_amount || 0)} />
                </div>
                <p className="text-xs text-slate-500 mt-2">Note</p>
                <p className="text-sm text-slate-700 wrap-break-word">{item.note || '-'}</p>
                <button type="button" className="mt-2 text-blue-700 text-xs font-semibold cursor-pointer" onClick={() => startEdit(item)}>Edit</button>
              </div>
            ))}
            {!history.length && <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-500">No payment history.</div>}
          </div>
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        {editingId ? <Button onClick={resetForm}>Cancel Edit</Button> : <span />}
        <Button
          variant="contained"
          disabled={loading}
          onClick={submit}
          sx={{
            px: 2.25,
            py: 1,
            borderRadius: 2,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            boxShadow: '0 8px 18px rgba(37,99,235,.35)',
            '&:hover': {
              background: 'linear-gradient(135deg, #0369a1 0%, #1d4ed8 100%)',
              boxShadow: '0 10px 22px rgba(29,78,216,.42)',
            },
          }}
        >
          {editingId ? 'Update Payment' : 'Save Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const premiumFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
    '& fieldset': { borderColor: '#cbd5e1' },
    '&:hover fieldset': { borderColor: '#94a3b8' },
    '&.Mui-focused fieldset': { borderColor: '#2563eb', borderWidth: '1px' },
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#1d4ed8',
  },
};

const dateFieldSx = {
  ...premiumFieldSx,
  cursor: 'pointer',
  '& .MuiInputBase-root': { cursor: 'pointer' },
  '& .MuiInputBase-input': { cursor: 'pointer' },
  '& .MuiInputLabel-root': { cursor: 'pointer' },
};

function Summary({ title, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function HistoryItem({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800 wrap-break-word">{value}</p>
    </div>
  );
}
