import { useEffect, useMemo, useState } from 'react';
import Layout from '../../Layout';
import Datatable from '../../Components/Datatable/Datatable';
import View from '../Lead/View';
import axios from 'axios';
import CachedIcon from '@mui/icons-material/Cached';
import ModeCommentOutlinedIcon from '@mui/icons-material/ModeCommentOutlined';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import RichTextEditor from '../../Components/RichTextEditor';
import { formatCurrencyGBP, formatLondonDate, formatLondonDateTime } from '../../utils/formatters';
import { markEditedRowForHighlight } from '../../utils/datatableState';
import PaymentCell from '../../Components/Datatable/PaymentCell';
import LeadPaymentModal from '../../Components/LeadPaymentModal';

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'PENDING' },
  { value: 'In_Quote', label: 'IN QUOTE' },
  { value: 'In_Survey', label: 'IN SITE SURVEY' },
  { value: 'In_Design', label: 'DRAWING' },
  { value: 'In_Review', label: 'UNDER REVIEW' },
  { value: 'Closed', label: 'CLOSED' },
  { value: 'Lost_Lead', label: 'LOST' },
];

const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((item) => [item.value, item.label]));
const STAGE_OPTIONS_BY_STATUS = {
  Pending: ['Follow-up', 'Not Interested', 'Decision Pending', 'Survey Paid', 'Drawing Paid', 'Full Paid', 'Hold', 'Other'],
  In_Quote: ['Follow-up', 'Quote Accepted', 'Invoice Sent', 'Survey Paid', 'Drawing Paid', 'Full Paid', 'Hold', 'Other'],
  In_Survey: ['Follow-up', 'Survey Scheduled', 'Survey Completed', 'Survey Report Sent', 'Drawing Paid', 'Hold', 'Other'],
  In_Design: ['Follow-up', 'First Draft Sent', 'Revision Ongoing', 'Final Draft Ready', 'Submitted for Review', 'Full Paid', 'Hold', 'Other'],
  In_Review: ['Follow-up', 'Review Ongoing', 'Changes Requested', 'Approved', 'Final Invoice Sent', 'Full Paid', 'Hold', 'Other'],
  Closed: ['Closed'],
  Lost_Lead: ['Lost'],
};
const STATUS_STAGE_FALLBACK = {
  Pending: 'Pending',
  In_Quote: 'Quote Sent',
  In_Survey: 'Under Survey',
  In_Design: 'Drawing',
  In_Review: 'Reviewing',
  Closed: 'Closed',
  Lost_Lead: 'Lost',
};
const STATUS_BADGE_CLASS = {
  Pending: 'bg-slate-100 text-slate-700 border-slate-300',
  In_Quote: 'bg-sky-50 text-sky-700 border-sky-300',
  In_Survey: 'bg-cyan-50 text-cyan-700 border-cyan-300',
  In_Design: 'bg-violet-50 text-violet-700 border-violet-300',
  In_Review: 'bg-amber-50 text-amber-700 border-amber-300',
  Closed: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  Lost_Lead: 'bg-rose-50 text-rose-700 border-rose-300',
};
const LEDGER_VISIBLE_STATUSES = new Set(['In_Quote', 'In_Survey', 'In_Design', 'In_Review']);
const COMMENT_DISABLED_STATUSES = new Set(['Closed', 'Lost_Lead']);

const ACTIONS_BY_STATUS = {
  Pending: [
    { key: 'move_in_quote', label: 'Quote', target: 'In_Quote' },
    { key: 'move_lost', label: 'Lost', target: 'Lost_Lead' },
  ],
  In_Quote: [
    { key: 'move_in_survey', label: 'Survey', target: 'In_Survey' },
    { key: 'move_in_design', label: 'Drawing', target: 'In_Design' },
    { key: 'move_closed', label: 'Close', target: 'Closed' },
    { key: 'move_lost', label: 'Lost', target: 'Lost_Lead' },
  ],
  In_Survey: [
    { key: 'survey_data', label: 'Survey Data', target: null },
    { key: 'move_in_design', label: 'Drawing', target: 'In_Design' },
    { key: 'move_lost', label: 'Lost', target: 'Lost_Lead' },
  ],
  In_Design: [
    { key: 'move_in_review', label: 'Submit', target: 'In_Review' },
    { key: 'move_lost', label: 'Lost', target: 'Lost_Lead' },
  ],
  In_Review: [
    { key: 'move_closed', label: 'Close', target: 'Closed' },
    { key: 'back_to_drawing', label: 'Back to Drawing', target: 'In_Design' },
  ],
  Closed: [{ key: 'move_pending', label: 'Back to Lead', target: 'Pending' }],
  Lost_Lead: [{ key: 'move_pending', label: 'Back to Lead', target: 'Pending' }],
};

const ACTION_META = {
  move_in_quote: { title: 'Send to In Quotation', hint: 'Requires quote price and quote file.' },
  move_in_survey: { title: 'Send to Site Survey', hint: 'Requires surveyor and survey date.' },
  move_in_design: { title: 'Send to Drawing Phase', hint: 'Requires design deadline.' },
  back_to_drawing: { title: 'Back to Drawing', hint: 'Move back to Drawing Phase with current designer/deadline.' },
  move_in_review: { title: 'Send to Under Review', hint: 'Optional design file link.' },
  move_closed: { title: 'Close Project', hint: 'Description is required. If any due remains, collect due before closing.' },
  move_lost: { title: 'Mark as Lost Lead', hint: 'Description required.' },
  move_pending: { title: 'Back to Leads', hint: 'Move project back to Leads.' },
  comment: { title: 'Add Comment', hint: 'Description required.' },
  survey_data: { title: 'Update Survey Data', hint: 'Survey done, file and note.' },
};

const isRichTextEmpty = (html = '') => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim() === '';
const cancelBtnSx = {
  px: 2.4,
  py: 0.95,
  borderRadius: 2,
  border: '1px solid #cbd5e1',
  color: '#334155',
  fontWeight: 700,
  textTransform: 'none',
  backgroundColor: '#ffffff',
  '&:hover': {
    borderColor: '#94a3b8',
    backgroundColor: '#f8fafc',
  },
};

const primaryBtnSx = {
  px: 2.6,
  py: 0.95,
  borderRadius: 2,
  fontWeight: 800,
  textTransform: 'none',
  boxShadow: '0 8px 18px rgba(15, 23, 42, 0.18)',
  background: 'linear-gradient(135deg, #1f2937 0%, #0f172a 100%)',
  '&:hover': {
    background: 'linear-gradient(135deg, #111827 0%, #020617 100%)',
    boxShadow: '0 10px 20px rgba(15, 23, 42, 0.24)',
  },
  '&.Mui-disabled': {
    background: '#94a3b8',
    color: 'rgba(255,255,255,0.7)',
  },
};

const getStatusDate = (row) => {
  if (row.status === 'Pending') return row.createdAt;
  if (row.status === 'In_Quote') return row.in_quote_date;
  if (row.status === 'In_Survey') return row.in_survey_date;
  if (row.status === 'In_Design') return row.in_design_date;
  if (row.status === 'In_Review') return row.in_review_date;
  if (row.status === 'Closed') return row.close_date;
  if (row.status === 'Lost_Lead') return row.lost_date;
  return row.createdAt;
};

const getWorkingStage = (row) => {
  const stage = String(row?.stage || '').trim();
  if (stage) return stage;
  return STATUS_STAGE_FALLBACK[row?.status] || '-';
};

export default function AllProjects() {
  document.title = 'All Projects';
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('All');

  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentLead, setPaymentLead] = useState(null);

  const [chooserOpen, setChooserOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [actionModal, setActionModal] = useState('');
  const [actionErrors, setActionErrors] = useState({});
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [stageForm, setStageForm] = useState({ stage: '', description: '' });
  const [form, setForm] = useState({
    quote_price: '', quote_file: '', surveyor: '', survey_date: '', designer: '', design_deadline: '', design_file: '', final_price: '', survey_file: '', survey_done: 'No',
    description: '',
  });
  const [closePaymentForm, setClosePaymentForm] = useState({ paid_at: '', amount: '', discount_given: '', note: '' });
  const [surveyors, setSurveyors] = useState([]);
  const [designers, setDesigners] = useState([]);
  const parseMoney = (value) => {
    const numeric = Number(String(value ?? 0).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/users`);
      setSurveyors(res.data.filter((u) => u.userType === 'Surveyor'));
      setDesigners(res.data.filter((u) => u.userType === 'Designer'));
    } catch {
      toast.error('Failed to load users');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/leads`);
      const rows = Array.isArray(res.data) ? res.data : [];
      setData(rows);
      setCompanies([...new Set(rows.map((item) => item.company).filter(Boolean))]);
    } catch {
      toast.error('Failed to fetch all projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUsers();
  }, []);

  const filteredData = useMemo(() => (
    selectedCompany === 'All' ? data : data.filter((item) => item.company === selectedCompany)
  ), [data, selectedCompany]);

  const openChooser = (row) => {
    setSelectedRow(row);
    setChooserOpen(true);
  };

  const handlePaymentClick = (row) => {
    setPaymentLead(row);
    setPaymentModalOpen(true);
  };
  const openStageModal = (row) => {
    setSelectedRow(row);
    setStageForm({ stage: row?.stage || '', description: '' });
    setStageModalOpen(true);
  };

  const availableActions = useMemo(() => {
    return ACTIONS_BY_STATUS[selectedRow?.status] || [];
  }, [selectedRow?.status]);

  const openAction = (key) => {
    if (key === 'back_to_drawing') {
      handleBackToDrawingAction();
      return;
    }

    setForm({
      quote_price: selectedRow?.quote_price || '',
      quote_file: selectedRow?.quote_file || '',
      surveyor: selectedRow?.surveyor || '',
      survey_date: selectedRow?.survey_date || '',
      designer: selectedRow?.designer || '',
      design_deadline: selectedRow?.design_deadline || '',
      design_file: selectedRow?.design_file || '',
      final_price: selectedRow?.final_price || '',
      survey_file: selectedRow?.survey_file || '',
      survey_done: selectedRow?.survey_done || 'No',
      description: '',
    });
    setActionErrors({});

    if (key === 'move_closed') {
      const existingDue = parseMoney(selectedRow?.payment_due_amount);
      setClosePaymentForm({
        paid_at: '',
        amount: existingDue > 0 ? String(existingDue) : '',
        discount_given: '0',
        note: 'Final due amount received while closing project.',
      });
    }
    setActionModal(key);
  };
  const openCommentAction = () => {
    if (!selectedRow) return;
    if (COMMENT_DISABLED_STATUSES.has(selectedRow.status)) return;
    openAction('comment');
  };

  const handleBackToDrawingAction = async () => {
    if (!selectedRow) return;
    if (!window.confirm(`Move back to Drawing Phase - ${selectedRow.leadCode?.toUpperCase()}?`)) return;

    try {
      await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/leads/in_design/${selectedRow._id}`, {
        agent: user?.name || '',
        design_deadline: selectedRow.design_deadline || '',
        designer: selectedRow.designer || '',
        description: 'Moved back from Under Review to Drawing Phase.',
      });
      markEditedRowForHighlight(selectedRow._id);
      toast.success('Project moved back to Drawing Phase!');
      setChooserOpen(false);
      fetchData();
    } catch {
      toast.error('Failed to move back to Drawing Phase.');
    }
  };

  const runAction = async () => {
    if (!selectedRow) return;
    const agent = user?.name || selectedRow.agent || 'System';
    const errors = {};

    if (actionModal === 'move_in_design') {
      if (!String(form.designer || '').trim()) errors.designer = 'Designer is required.';
      if (!String(form.design_deadline || '').trim()) errors.design_deadline = 'Design deadline is required.';
    }

    if (Object.keys(errors).length) {
      setActionErrors(errors);
      toast.error('Please complete the required fields.');
      return;
    }

    const needsDescription = selectedRow?.status === 'In_Quote'
      ? ['move_in_quote', 'move_in_survey', 'move_in_design', 'move_in_review', 'move_lost', 'comment', 'survey_data'].includes(actionModal)
      : ['move_in_quote', 'move_in_survey', 'move_in_design', 'move_in_review', 'move_closed', 'move_lost', 'comment', 'survey_data'].includes(actionModal);

    if (needsDescription && isRichTextEmpty(form.description)) {
      toast.error('Description is required.');
      return;
    }

    try {
      if (actionModal === 'move_in_quote') {
        await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/leads/in_quote/${selectedRow._id}`, { agent, quote_price: form.quote_price, quote_file: form.quote_file, description: form.description });
      } else if (actionModal === 'move_in_survey') {
        await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/leads/in_survey/${selectedRow._id}`, { agent, surveyor: form.surveyor, survey_date: form.survey_date, description: form.description });
      } else if (actionModal === 'move_in_design') {
        await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/leads/in_design/${selectedRow._id}`, { agent, designer: form.designer, design_deadline: form.design_deadline, description: form.description });
      } else if (actionModal === 'move_in_review') {
        await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/leads/In_review/${selectedRow._id}`, { agent, design_file: form.design_file, description: form.description });
      } else if (actionModal === 'move_closed') {
        const dueAmount = parseMoney(selectedRow?.payment_due_amount);
        const collectAmount = parseMoney(closePaymentForm.amount);
        const collectDiscount = parseMoney(closePaymentForm.discount_given);
        if (dueAmount > 0 && (collectAmount + collectDiscount !== dueAmount)) {
          toast.error(`Please settle full due amount (${formatCurrencyGBP(dueAmount)}) using receive amount and/or discount before closing.`);
          return;
        }
        if (dueAmount > 0) {
          await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/leads/payments/${selectedRow._id}`, {
            amount: collectAmount,
            discount_given: collectDiscount,
            note: closePaymentForm.note,
            paid_at: closePaymentForm.paid_at || undefined,
            agent,
          });
        }
        const closePayload = {
          agent,
          description: form.description,
          survey_date: selectedRow?.status === 'In_Quote' ? form.survey_date : undefined,
          surveyor: selectedRow?.status === 'In_Quote' ? form.surveyor : undefined,
          design_deadline: selectedRow?.status === 'In_Quote' ? form.design_deadline : undefined,
          designer: selectedRow?.status === 'In_Quote' ? form.designer : undefined,
          close_source: selectedRow?.status === 'In_Quote' ? 'In_Quote' : undefined,
        };
        await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/leads/closed/${selectedRow._id}`, closePayload);
      } else if (actionModal === 'move_lost') {
        await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/leads/lost_lead/${selectedRow._id}`, { agent, description: form.description });
      } else if (actionModal === 'move_pending') {
        await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/leads/pending/${selectedRow._id}`);
      } else if (actionModal === 'comment') {
        await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/leads/comment/${selectedRow._id}`, { agent, description: form.description });
      } else if (actionModal === 'survey_data') {
        await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/leads/survey_data/${selectedRow._id}`, { agent, survey_file: form.survey_file, survey_done: form.survey_done, survey_note: form.description });
      }

      markEditedRowForHighlight(selectedRow._id);
      toast.success('Project status updated successfully');
      setActionModal('');
      setChooserOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data || 'Failed to update status');
    }
  };
  const submitStage = async () => {
    if (!selectedRow) return;
    if (!String(stageForm.stage || '').trim()) {
      toast.error('Stage is required.');
      return;
    }
    if (isRichTextEmpty(stageForm.description)) {
      toast.error('Description is required.');
      return;
    }
    try {
      await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/leads/${selectedRow._id}`, {
        company: selectedRow.company,
        client: selectedRow.client?._id || selectedRow.client,
        source: selectedRow.source,
        stage: stageForm.stage,
        description: stageForm.description,
        agent: user?.name || selectedRow.agent || 'System',
      });
      markEditedRowForHighlight(selectedRow._id);
      toast.success('Working stage updated successfully');
      setStageModalOpen(false);
      fetchData();
    } catch {
      toast.error('Failed to update working stage.');
    }
  };

  const renderClientCell = (row) => {
    const clientName = row.client?.name || 'N/A';
    const companyName = row.client?.company?.trim() ? row.client.company : null;
    const displayText = companyName ? `${clientName} (${companyName})` : clientName;
    return (
      <div className="max-w-64 min-w-0">
        <p className="truncate text-slate-700" title={displayText}>{displayText}</p>
        <p className="truncate text-xs text-slate-500" title={`${row.client?.phone || ''} ${row.client?.email || ''}`}>{row.client?.phone || 'N/A'} {row.client?.email ? `(${row.client.email})` : ''}</p>
      </div>
    );
  };

  const renderAddress = (row) => {
    const address = row.address?.trim() || 'N/A';
    return (
      <p className="block text-xs leading-4 text-slate-600" title={address} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word', width: '230px', minWidth: '230px', maxWidth: '230px' }}>
        {address}
      </p>
    );
  };

  const columns = [
    { key: 'date', header: 'Date', maxSize: 80, Cell: ({ row }) => formatLondonDate(getStatusDate(row.original)) },
    { key: 'leadCode', accessorKey: 'leadCode', header: 'Code', maxSize: 80 },
    { key: 'client', header: 'Client', minSize: 220, maxSize: 280, Cell: ({ row }) => renderClientCell(row.original) },
    { key: 'address', header: 'Project Address', minSize: 220, maxSize: 230, Cell: ({ row }) => renderAddress(row.original) },
    {
      key: 'payment',
      header: 'Payment',
      minSize: 120,
      maxSize: 150,
      Cell: ({ row }) => (
        LEDGER_VISIBLE_STATUSES.has(row.original.status) ? (
          <PaymentCell lead={row.original} onClick={handlePaymentClick} showSummary={true} />
        ) : (
          <span className="text-xs text-slate-500">-</span>
        )
      ),
    },
    {
      key: 'stage',
      accessorKey: 'stage',
      header: 'Working Stage',
      maxSize: 130,
      muiTableHeadCellProps: { align: 'center' },
      muiTableBodyCellProps: {
        align: 'center',
        sx: { '& > div': { justifyContent: 'center' } },
      },
      Cell: ({ row }) => (
        <button
          type="button"
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            openStageModal(row.original);
          }}
          title="Update working stage"
        >
          {getWorkingStage(row.original)}
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      maxSize: 100,
      muiTableHeadCellProps: { align: 'center' },
      muiTableBodyCellProps: {
        align: 'center',
        sx: { '& > div': { justifyContent: 'center' } },
      },
      Cell: ({ row }) => {
        const status = row.original.status;
        const label = STATUS_LABEL[status] || status;
        const badgeClass = STATUS_BADGE_CLASS[status] || 'bg-slate-100 text-slate-700 border-slate-300';
        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${badgeClass}`}>
            {label}
          </span>
        );
      },
    },
    {
      id: 'set_status',
      header: 'Update Status',
      minSize: 120,
      maxSize: 140,
      Cell: ({ row }) => (
        <button
          className="ml-2 inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); openChooser(row.original); }}
          title="Open status actions"
        >
          Update Status
        </button>
      ),
    },
  ];
  const paymentHistory = Array.isArray(selectedRow?.payment_history) ? selectedRow.payment_history : [];
  const dueAmount = parseMoney(selectedRow?.payment_due_amount);
  const receivedAmount = parseMoney(selectedRow?.payment_received_total);
  const collectAmount = parseMoney(closePaymentForm.amount);
  const collectDiscount = parseMoney(closePaymentForm.discount_given);
  const canCloseProject = dueAmount <= 0 || (collectAmount + collectDiscount === dueAmount);

  return (
    <Layout>
      <ToastContainer position="bottom-right" autoClose={2200} />

      <section className="leadPageShell">
        <div className="leadPageHeader">
          <div className="leadPageHeaderLeft">
            <h1 className="leadPageTitle">All Projects</h1>
            {loading ? (
              <div className="flex items-center justify-center text-white">
                <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="3" strokeDasharray="10" strokeDashoffset="75" />
                </svg>
              </div>
            ) : (
              <button className="text-gray-200 hover:text-white cursor-pointer" onClick={fetchData} title="Refresh">
                <CachedIcon />
              </button>
            )}
            <span className="leadPageCount">Total: {filteredData.length}</span>
          </div>
          <div className="leadPageHeaderActions">
            <select className="leadPageFilterSelect" value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}>
              <option value="All">All Companies</option>
              {companies.map((company) => <option key={company} value={company}>{company}</option>)}
            </select>
          </div>
        </div>

        <div className="leadPageTableWrap">
          <Datatable
            columns={columns}
            data={filteredData}
            onView={(row) => { setViewData(row); setViewOpen(true); }}
            onEdit={() => { }}
            onDelete={() => { }}
            permissions={{ canView: true, canEdit: false, canDelete: false }}
          />
        </div>
      </section>

      {viewOpen && <View open={viewOpen} onClose={() => setViewOpen(false)} viewData={viewData} />}

      <Dialog open={chooserOpen} onClose={() => setChooserOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ pb: 1.2 }}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[13px] font-semibold tracking-wide text-slate-500 uppercase">Project Action</p>
              <h2 className="text-[30px] leading-tight font-extrabold text-slate-900">Update Status</h2>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Code</p>
              <p className="text-sm font-bold text-slate-800">{selectedRow?.leadCode?.toUpperCase() || '-'}</p>
            </div>
          </div>
        </DialogTitle>
        <DialogContent sx={{ pt: '6px !important', pb: 2 }}>
          <div className="rounded-xl border border-slate-200 bg-linear-to-r from-slate-50 to-slate-100 p-3 mb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Current Status</p>
                <span className={`mt-1 inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-bold shadow-sm ${STATUS_BADGE_CLASS[selectedRow?.status] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                  {STATUS_LABEL[selectedRow?.status] || selectedRow?.status || '-'}
                </span>
              </div>
              {!COMMENT_DISABLED_STATUSES.has(selectedRow?.status) && (
                <button
                  type="button"
                  onClick={openCommentAction}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-700 transition-all duration-200 hover:border-slate-500 hover:bg-white hover:shadow-sm cursor-pointer"
                >
                  <ModeCommentOutlinedIcon sx={{ fontSize: 16 }} />
                  Add Comment
                </button>
              )}
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.06em]">Available Actions</p>
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
            {availableActions.map((action) => {
              return (
                <button
                  key={action.key}
                  type="button"
                  className="group rounded-xl border border-slate-200 bg-linear-to-br from-white to-slate-50 p-3.5 text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
                  onClick={() => openAction(action.key)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800 group-hover:text-slate-900">{ACTION_META[action.key]?.title || action.label}</p>
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-slate-300 group-hover:bg-slate-500" />
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">{ACTION_META[action.key]?.hint || ''}</p>
                </button>
              );
            })}
          </div>
          {!availableActions.length && <p className="mt-3 text-sm text-slate-500">No action available for this project status.</p>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(actionModal)} onClose={() => setActionModal('')} fullWidth maxWidth="sm">
        <DialogTitle><b>Update - {selectedRow?.leadCode?.toUpperCase() || ''}</b></DialogTitle>
        <DialogContent>
          {actionModal === 'move_in_quote' && (
            <>
              <TextField fullWidth size="small" margin="normal" label="Quoted Price*" value={form.quote_price} onChange={(e) => setForm((p) => ({ ...p, quote_price: e.target.value }))} />
              <TextField fullWidth size="small" margin="normal" label="Quote File Link*" value={form.quote_file} onChange={(e) => setForm((p) => ({ ...p, quote_file: e.target.value }))} />
            </>
          )}

          {actionModal === 'move_in_survey' && (
            <>
              <TextField select fullWidth size="small" margin="normal" label="Surveyor*" value={form.surveyor} onChange={(e) => setForm((p) => ({ ...p, surveyor: e.target.value }))}>
                <MenuItem value="">Select Surveyor</MenuItem>
                {surveyors.map((item) => <MenuItem key={item._id} value={item.name}>{item.name} - {item.phone}</MenuItem>)}
              </TextField>
              <TextField fullWidth type="date" size="small" margin="normal" InputLabelProps={{ shrink: true }} label="Survey Date*" value={form.survey_date} onChange={(e) => setForm((p) => ({ ...p, survey_date: e.target.value }))} />
            </>
          )}

          {actionModal === 'move_in_design' && (
            <>
              <TextField
                select
                fullWidth
                size="small"
                margin="normal"
                label="Designer*"
                value={form.designer}
                error={Boolean(actionErrors.designer)}
                helperText={actionErrors.designer || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((p) => ({ ...p, designer: value }));
                  setActionErrors((prev) => ({ ...prev, designer: value ? '' : prev.designer }));
                }}
              >
                <MenuItem value="">Select Designer</MenuItem>
                {designers.map((item) => <MenuItem key={item._id} value={item.name}>{item.name} - {item.phone}</MenuItem>)}
              </TextField>
              <TextField
                fullWidth
                type="date"
                size="small"
                margin="normal"
                InputLabelProps={{ shrink: true }}
                label="Design Deadline*"
                value={form.design_deadline}
                error={Boolean(actionErrors.design_deadline)}
                helperText={actionErrors.design_deadline || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((p) => ({ ...p, design_deadline: value }));
                  setActionErrors((prev) => ({ ...prev, design_deadline: value ? '' : prev.design_deadline }));
                }}
              />
            </>
          )}

          {actionModal === 'move_in_review' && (
            <TextField fullWidth size="small" margin="normal" label="Design File Link (optional)" value={form.design_file} onChange={(e) => setForm((p) => ({ ...p, design_file: e.target.value }))} />
          )}

          {actionModal === 'move_closed' && (
            <>
              {selectedRow?.status === 'In_Quote' && (
                <>
                  <TextField fullWidth type="date" size="small" margin="normal" InputLabelProps={{ shrink: true }} label="Survey Date" value={form.survey_date} onChange={(e) => setForm((p) => ({ ...p, survey_date: e.target.value }))} />
                  <TextField select fullWidth size="small" margin="normal" label="Surveyor" value={form.surveyor} onChange={(e) => setForm((p) => ({ ...p, surveyor: e.target.value }))}>
                    <MenuItem value="">Select Surveyor</MenuItem>
                    {surveyors.map((item) => <MenuItem key={item._id} value={item.name}>{item.name} - {item.phone}</MenuItem>)}
                  </TextField>
                  <TextField fullWidth type="date" size="small" margin="normal" InputLabelProps={{ shrink: true }} label="Design Deadline" value={form.design_deadline} onChange={(e) => setForm((p) => ({ ...p, design_deadline: e.target.value }))} />
                  <TextField select fullWidth size="small" margin="normal" label="Select Architect/Designer" value={form.designer} onChange={(e) => setForm((p) => ({ ...p, designer: e.target.value }))}>
                    <MenuItem value="">Select Architect/Designer</MenuItem>
                    {designers.map((item) => <MenuItem key={item._id} value={item.name}>{item.name} - {item.phone}</MenuItem>)}
                  </TextField>
                </>
              )}

              <div className='grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3 mt-2'>
                <div><p className='text-xs text-slate-500'>Quoted</p><p className='font-semibold text-slate-800'>{formatCurrencyGBP(selectedRow?.quote_price || 0)}</p></div>
                <div><p className='text-xs text-slate-500'>Received</p><p className='font-semibold text-emerald-700'>{formatCurrencyGBP(receivedAmount)}</p></div>
                <div><p className='text-xs text-slate-500'>Due</p><p className='font-semibold text-red-600'>{formatCurrencyGBP(dueAmount)}</p></div>
              </div>
              <small className='block text-gray-600 mb-3'>Final due amount must be received before closing the project.</small>

              <div className='rounded-lg border border-slate-200 mb-3'>
                <div className='px-3 py-2 bg-slate-100 border-b border-slate-200'>
                  <p className='text-sm font-semibold text-slate-700'>Payment History</p>
                </div>
                <div className='max-h-44 overflow-y-auto'>
                  <table className='w-full text-sm'>
                    <thead className='bg-slate-50'>
                      <tr>
                        <th className='text-left px-3 py-2'>Date</th>
                        <th className='text-left px-3 py-2'>Agent</th>
                        <th className='text-left px-3 py-2'>Amount</th>
                        <th className='text-left px-3 py-2'>Discount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((item) => (
                        <tr key={item._id} className='border-t border-slate-200'>
                          <td className='px-3 py-2'>{formatLondonDateTime(item?.paid_at)}</td>
                          <td className='px-3 py-2'>{item?.agent || '-'}</td>
                          <td className='px-3 py-2'>{formatCurrencyGBP(item?.paid_amount || 0)}</td>
                          <td className='px-3 py-2'>{formatCurrencyGBP(item?.discount_given || 0)}</td>
                        </tr>
                      ))}
                      {!paymentHistory.length && (
                        <tr><td className='px-3 py-3 text-slate-500' colSpan={4}>No payment history found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {dueAmount > 0 && (
                <>
                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
                    <TextField fullWidth type="date" size="small" margin="normal" label="Payment Date" InputLabelProps={{ shrink: true }} value={closePaymentForm.paid_at} onChange={e => setClosePaymentForm(prev => ({ ...prev, paid_at: e.target.value }))} />
                    <TextField fullWidth type="number" size="small" margin="normal" label={`Receive Amount (${formatCurrencyGBP(dueAmount)})*`} value={closePaymentForm.amount} onChange={e => setClosePaymentForm(prev => ({ ...prev, amount: e.target.value }))} />
                    <TextField fullWidth type="number" size="small" margin="normal" label="Discount Given" value={closePaymentForm.discount_given} onChange={e => setClosePaymentForm(prev => ({ ...prev, discount_given: e.target.value }))} />
                  </div>
                  <TextField fullWidth size="small" margin="normal" label="Payment Note" multiline minRows={2} value={closePaymentForm.note} onChange={e => setClosePaymentForm(prev => ({ ...prev, note: e.target.value }))} />
                </>
              )}
            </>
          )}

          {actionModal === 'survey_data' && (
            <>
              <TextField fullWidth size="small" margin="normal" label="Survey File Link" value={form.survey_file} onChange={(e) => setForm((p) => ({ ...p, survey_file: e.target.value }))} />
              <TextField select fullWidth size="small" margin="normal" label="Survey Done" value={form.survey_done} onChange={(e) => setForm((p) => ({ ...p, survey_done: e.target.value }))}>
                <MenuItem value="No">No</MenuItem>
                <MenuItem value="Yes">Yes</MenuItem>
              </TextField>
            </>
          )}

          {actionModal !== 'move_pending' && (
            <div className="mt-3">
              <RichTextEditor value={form.description} onChange={(value) => setForm((p) => ({ ...p, description: value }))} />
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.2, pt: 1.2, gap: 1.2 }}>
          <Button onClick={() => setActionModal('')} sx={cancelBtnSx}>Cancel</Button>
          <Button
            variant="contained"
            onClick={runAction}
            disabled={actionModal === 'move_closed' ? !canCloseProject : false}
            sx={primaryBtnSx}
          >
            {actionModal === 'move_closed' ? 'Collect Due & Close Project' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      <LeadPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        lead={paymentLead}
        onUpdated={() => fetchData()}
      />
      <Dialog open={stageModalOpen} onClose={() => setStageModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle><b>Update Working Stage - {selectedRow?.leadCode?.toUpperCase() || ''}</b></DialogTitle>
        <DialogContent>
          {!COMMENT_DISABLED_STATUSES.has(selectedRow?.status) && (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!selectedRow) return;
                  setStageModalOpen(false);
                  openCommentAction();
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-700 transition-all duration-200 hover:border-slate-500 hover:bg-white hover:shadow-sm cursor-pointer"
              >
                <ModeCommentOutlinedIcon sx={{ fontSize: 16 }} />
                Add Comment
              </button>
            </div>
          )}
          <TextField
            select
            fullWidth
            size="small"
            margin="normal"
            label="Working Stage*"
            value={stageForm.stage}
            onChange={(e) => setStageForm((prev) => ({ ...prev, stage: e.target.value }))}
          >
            <MenuItem value="">Select working stage</MenuItem>
            {(STAGE_OPTIONS_BY_STATUS[selectedRow?.status] || ['Other']).map((item) => (
              <MenuItem key={item} value={item}>{item}</MenuItem>
            ))}
          </TextField>
          <div className="mt-2">
            <RichTextEditor
              value={stageForm.description}
              onChange={(value) => setStageForm((prev) => ({ ...prev, description: value }))}
            />
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.2, pt: 1.2, gap: 1.2 }}>
          <Button onClick={() => setStageModalOpen(false)} sx={cancelBtnSx}>Cancel</Button>
          <Button variant="contained" onClick={submitStage} sx={primaryBtnSx}>Update Stage</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
