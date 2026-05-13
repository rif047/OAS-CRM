import { useMemo, useState } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SearchIcon from '@mui/icons-material/Search';
import SummarizeRoundedIcon from '@mui/icons-material/SummarizeRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import Layout from '../../Layout';
import { formatCurrencyGBP, formatLondonDateTime } from '../../utils/formatters';
import { formatAssignees } from '../../utils/assignees';
import 'react-toastify/dist/ReactToastify.css';

const STATUS_LABELS = {
  Pending: 'Pending',
  In_Quote: 'In Quote',
  In_Survey: 'In Survey',
  In_Design: 'In Design',
  In_Review: 'In Review',
  Closed: 'Closed',
  Lost_Lead: 'Lost Lead',
};

const STEP_JOURNEY_SERIAL = [
  { key: 'createdAt', label: 'Project Created', type: 'date' },
  { key: 'in_quote_date', label: 'Moved to Quote', type: 'date' },
  { key: 'in_survey_date', label: 'Moved to Survey', type: 'date' },
  { key: 'surveyor', label: 'Surveyor' },
  { key: 'survey_date', label: 'Survey Date', type: 'date' },
  { key: 'in_design_date', label: 'Moved to Design', type: 'date' },
  { key: 'designer', label: 'Designer' },
  { key: 'design_deadline', label: 'Design Deadline', type: 'date' },
  { key: 'in_review_date', label: 'Moved to Review', type: 'date' },
  { key: 'close_date', label: 'Project Closed', type: 'date' },
];

const getDateObject = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string') {
    const raw = value.trim();
    const ddmmyyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{2}))?$/);
    if (ddmmyyyy) {
      const [, dd, mm, yyyy, hh = '0', min = '0'] = ddmmyyyy;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
    }
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const stripHtml = (html = '') =>
  String(html)
    .replace(/<br\s*\/?/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const parseMoney = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getMatchedLeads = (leads, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return leads.filter((item) => String(item?.leadCode || '').toLowerCase().includes(q));
};

const getStepJourney = (lead) => {
  const steps = STEP_JOURNEY_SERIAL
    .map((field) => {
      const rawValue = lead?.[field.key];
      if (field.type === 'date') {
        const date = getDateObject(rawValue);
        return {
          key: field.key,
          step: field.label,
          value: date ? formatLondonDateTime(date) : 'N/A',
        };
      }
      return {
        key: field.key,
        step: field.label,
        value: field.key === 'surveyor' ? formatAssignees(rawValue) : (rawValue || 'N/A'),
      };
    });

  return steps;
};

const getDisplayValue = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  return String(value);
};

export default function ProjectHistory() {
  document.title = 'Project History';

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [allLeads, setAllLeads] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');

  const matchedLeads = useMemo(() => getMatchedLeads(allLeads, query), [allLeads, query]);
  const selectedLead = useMemo(() => {
    if (!matchedLeads.length) return null;
    if (!selectedLeadId) return matchedLeads[0];
    return matchedLeads.find((item) => item._id === selectedLeadId) || matchedLeads[0];
  }, [matchedLeads, selectedLeadId]);

  const stepJourney = useMemo(() => (selectedLead ? getStepJourney(selectedLead) : []), [selectedLead]);
  const paymentSummary = useMemo(() => {
    if (!selectedLead) return { quote: 0, received: 0, due: 0 };

    const quote = parseMoney(selectedLead.quote_price);
    const history = Array.isArray(selectedLead.payment_history) ? selectedLead.payment_history : [];
    const historyReceived = history.reduce((sum, item) => sum + parseMoney(item?.paid_amount), 0);
    const historyDiscount = history.reduce((sum, item) => sum + parseMoney(item?.discount_given), 0);
    const received = parseMoney(
      selectedLead.payment_received_total !== undefined && selectedLead.payment_received_total !== null
        ? selectedLead.payment_received_total
        : historyReceived
    );
    const due = Math.max(quote - (received + historyDiscount), 0);

    return { quote, received, due };
  }, [selectedLead]);
  const projectDetailsRows = useMemo(() => {
    if (!selectedLead) return [];

    return [
      { label: 'Code', value: selectedLead.leadCode || 'N/A' },
      { label: 'Source', value: selectedLead.source || 'N/A' },
      { label: 'Surveyor', value: formatAssignees(selectedLead.surveyor) },
      { label: 'Designer', value: selectedLead.designer || 'N/A' },
      { label: 'Need Planning Permission?', value: getDisplayValue(selectedLead.planning_permission) },
      { label: 'Need Structural Services?', value: getDisplayValue(selectedLead.structural_services) },
      { label: 'Need Interior Design?', value: getDisplayValue(selectedLead.interior_design) },
      { label: 'Need Building Regulation Services?', value: getDisplayValue(selectedLead.building_regulation) },
      { label: 'Did Select Builder?', value: getDisplayValue(selectedLead.select_builder) },
      { label: 'Need Help In Project Management?', value: getDisplayValue(selectedLead.help_project_management) },
      { label: 'Project Address', value: selectedLead.address || 'N/A', fullWidth: true },
      { label: 'Project Type', value: selectedLead.project_type || 'N/A', fullWidth: true },
      { label: 'Service Type', value: selectedLead.service_type || 'N/A', fullWidth: true },
    ];
  }, [selectedLead, paymentSummary]);

  const fetchLeads = async () => {
    if (loading) return;
    if (!query.trim()) {
      toast.info('Please enter a project code first.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/leads`);
      setAllLeads(Array.isArray(data) ? data : []);
      setHasFetched(true);
      setSelectedLeadId('');
    } catch {
      toast.error('Failed to load project history data.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    if (!selectedLead) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const addSectionTitle = (title) => {
      const y = (doc.lastAutoTable?.finalY || 24) + 8;
      doc.setFontSize(11.5);
      doc.setTextColor(15, 23, 42);
      doc.text(title, 14, y);
      return y;
    };

    const statusLabel = STATUS_LABELS[selectedLead.status] || selectedLead.status || 'N/A';
    const clientRows = [
      ['Client Name', selectedLead.client?.name || 'N/A'],
      ['Client Phone', selectedLead.client?.phone || 'N/A'],
      ['Client Email', selectedLead.client?.email || 'N/A'],
      ['Client Company', selectedLead.client?.company || selectedLead.company || 'N/A'],
    ];

    const detailsRows = projectDetailsRows.map((row) => [row.label, row.value || 'N/A']);
    const topSummaryRows = [
      ['Project Code', selectedLead.leadCode || 'N/A'],
      ['Status', statusLabel],
      ['Quote', formatCurrencyGBP(paymentSummary.quote)],
      ['Received', formatCurrencyGBP(paymentSummary.received)],
      ['Due', formatCurrencyGBP(paymentSummary.due)],
      ['Generated At', formatLondonDateTime(new Date())],
    ];

    doc.setFontSize(17);
    doc.setTextColor(15, 23, 42);
    doc.text('Project History Report', 14, 16);

    autoTable(doc, {
      startY: 21,
      head: [['Summary', 'Value']],
      body: topSummaryRows,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2.4, textColor: [30, 41, 59] },
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 50 } },
    });

    autoTable(doc, {
      startY: addSectionTitle('Client Information') + 2,
      head: [['Field', 'Value']],
      body: clientRows,
      theme: 'striped',
      styles: { fontSize: 8.8, cellPadding: 2.2 },
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 50 } },
    });

    autoTable(doc, {
      startY: addSectionTitle('Project Details') + 2,
      head: [['Field', 'Value']],
      body: detailsRows,
      theme: 'striped',
      styles: { fontSize: 8.6, cellPadding: 2.1, valign: 'top' },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 62 } },
    });

    const scopeText = stripHtml(selectedLead.project_details || '') || 'No project details provided.';
    autoTable(doc, {
      startY: addSectionTitle('Project Details / Scope of Work') + 2,
      head: [['Details']],
      body: [[scopeText]],
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.2, valign: 'top', overflow: 'linebreak' },
      headStyles: { fillColor: [3, 105, 161], textColor: [255, 255, 255] },
    });

    autoTable(doc, {
      startY: addSectionTitle('Step Journey (Serial Maintained)') + 2,
      head: [['Serial', 'Step', 'Value']],
      body: stepJourney.map((item, index) => [index + 1, item.step, item.value]),
      theme: 'striped',
      styles: { fontSize: 8.7, valign: 'top', cellPadding: 2.1 },
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 64 } },
    });

    const descriptionText = stripHtml(selectedLead.description || '') || 'No description provided.';
    autoTable(doc, {
      startY: addSectionTitle('Description') + 2,
      head: [['Notes']],
      body: [[descriptionText]],
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.2, valign: 'top', overflow: 'linebreak' },
      headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255] },
    });

    doc.save(`${selectedLead.leadCode || 'project'}-history.pdf`);
  };

  return (
    <Layout>
      <div>
        <ToastContainer position="top-right" autoClose={2500} />

        <div className="w-full space-y-3">
          <div className="mb-2 rounded-xl border border-slate-200 bg-linear-to-r from-[#3a4259] to-[#475569] px-3 py-2 shadow-sm">
            <div
              className="flex flex-col gap-2 xl:flex-row xl:items-center"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  fetchLeads();
                }
              }}
            >
              <div className="shrink-0 xl:min-w-[300px]">
                <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-white md:text-[26px]">
                  <HistoryEduIcon fontSize="small" sx={{ color: '#bfdbfe' }} /> Project History
                </h1>
                <p className="mt-0.5 text-[13px] text-slate-200 md:text-sm">
                  Search by project code and view full step-by-step history with date and details.
                </p>
              </div>

              <div className="relative w-full xl:ml-auto xl:w-[300px]">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fontSize="small" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLeads()}
                  placeholder="Enter project code, e.g. CIC-123ABC"
                  className="h-9 w-full rounded-lg border border-slate-300/90 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                />
              </div>

              <div className="flex flex-wrap gap-2 xl:shrink-0">
                <button
                  type="button"
                  onClick={fetchLeads}
                  disabled={loading}
                  className="inline-flex h-[38px] min-w-[170px] items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 text-sm font-semibold leading-none text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  <SummarizeRoundedIcon sx={{ fontSize: 18, color: '#bfdbfe' }} />
                  {loading ? 'Loading...' : 'Generate Report'}
                </button>
                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={!selectedLead}
                  className="inline-flex h-[36px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold leading-none text-slate-800 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                >
                  <FileDownloadRoundedIcon sx={{ fontSize: 18, color: '#059669' }} /> Download Report
                </button>
              </div>
            </div>
          </div>

          {hasFetched && !matchedLeads.length && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
              No project found for code: <b>{query}</b>
            </div>
          )}

          {!!matchedLeads.length && (
            <>
              {matchedLeads.length > 1 && (
                <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm">
                  <p className="mb-2 text-sm font-semibold text-slate-700">Multiple matches found ({matchedLeads.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {matchedLeads.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => setSelectedLeadId(item._id)}
                        className={`rounded-md border px-2.5 py-1.5 text-[13px] transition ${selectedLead?._id === item._id
                          ? 'border-gray-600 bg-gray-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-gray-500 hover:text-gray-700'
                          }`}
                      >
                        {item.leadCode}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <MetricCard title="Status" value={STATUS_LABELS[selectedLead.status] || selectedLead.status || 'N/A'} />
                  <MetricCard title="Quote" value={formatCurrencyGBP(paymentSummary.quote)} />
                  <MetricCard title="Received" value={formatCurrencyGBP(paymentSummary.received)} />
                  <MetricCard title="Due" value={formatCurrencyGBP(paymentSummary.due)} />
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/70">
                  <div className="border-b border-slate-200/90 bg-slate-50 px-3.5 py-2.5">
                    <h2 className="mb-0 flex items-center gap-2 text-[15px] font-bold text-slate-800 md:text-base">
                      <PersonIcon fontSize="small" /> Client Information
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 p-3 sm:grid-cols-2">
                    <KeyValueRow label="Client Name" value={selectedLead.client?.name || 'N/A'} stacked />
                    <KeyValueRow label="Client Phone" value={selectedLead.client?.phone || 'N/A'} stacked />
                    <KeyValueRow label="Client Email" value={selectedLead.client?.email || 'N/A'} stacked />
                    <KeyValueRow label="Client Company" value={selectedLead.client?.company || selectedLead.company || 'N/A'} stacked />
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/70">
                  <div className="border-b border-slate-200/90 bg-slate-50 px-3.5 py-2.5">
                    <h2 className="mb-0 flex items-center gap-2 text-[15px] font-bold text-slate-800 md:text-base">
                      <CorporateFareIcon fontSize="small" /> Project Details
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 p-3 sm:grid-cols-2">
                    {projectDetailsRows.map((row) => (
                      <div key={row.label} className={row.fullWidth ? 'sm:col-span-2' : ''}>
                        <KeyValueRow label={row.label} value={row.value} stacked />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/70">
                  <div className="border-b border-slate-200/90 bg-slate-50 px-3.5 py-2.5">
                    <h2 className="mb-0 flex items-center gap-2 text-[15px] font-bold text-slate-800 md:text-base">
                      <CorporateFareIcon fontSize="small" /> Project Details / Scope of Work
                    </h2>
                  </div>
                  <div className="p-3">
                    <RichTextView html={selectedLead.project_details} emptyText="No project details provided." />
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/70">
                  <div className="border-b border-slate-200/90 bg-slate-50 px-3.5 py-2.5">
                    <div className="mb-0 flex items-center justify-between gap-2">
                      <h2 className="flex items-center gap-2 text-[15px] font-bold text-slate-900 md:text-base">
                        <CalendarMonthIcon fontSize="small" /> Step Journey
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 p-3 sm:grid-cols-2">
                    {stepJourney.map((item, index) => (
                      <div
                        key={`${item.key}-${item.value}-${index}`}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm shadow-slate-100/70"
                      >
                        <div className="space-y-1 text-[12.5px] md:text-sm">
                          <p className="flex items-center gap-1.5 font-semibold leading-tight text-slate-700">
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1 text-[11px] font-bold text-gray-700">{index + 1}</span>
                            {item.step}
                          </p>
                          <p className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-900">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/70">
                  <div className="border-b border-slate-200/90 bg-slate-50 px-3.5 py-2.5">
                    <h2 className="mb-0 flex items-center gap-2 text-[15px] font-bold text-slate-800 md:text-base">
                      <PersonIcon fontSize="small" /> Description
                    </h2>
                  </div>
                  <div className="p-3">
                    <RichTextView html={selectedLead.description} emptyText="No description provided." />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function MetricCard({ title, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-bold text-slate-900 md:text-base">{value}</p>
    </div>
  );
}

function KeyValueRow({ label, value, stacked = false }) {
  if (stacked) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm shadow-slate-100/70">
        <div className="space-y-1 text-[12.5px] md:text-sm">
          <p className="font-semibold leading-tight text-slate-700">{label}</p>
          <p className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-900">{value || 'N/A'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm shadow-slate-100/70">
      <div className="flex items-start justify-between gap-2 text-[12.5px] md:text-sm">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-right font-semibold text-slate-900">{value || 'N/A'}</span>
      </div>
    </div>
  );
}

function RichTextView({ html, emptyText }) {
  const hasHtml = typeof html === 'string' && html.trim();
  if (!hasHtml) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div
      className="description-view rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm leading-6 text-slate-700"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
