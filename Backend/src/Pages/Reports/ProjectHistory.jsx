import { useMemo, useState } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import Layout from '../../Layout';
import { formatCurrencyGBP, formatLondonDateTime } from '../../utils/formatters';
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

const STAGE_DATE_FIELDS = [
  { key: 'createdAt', step: 'Project Created' },
  { key: 'in_quote_date', step: 'Moved to Quote' },
  { key: 'in_survey_date', step: 'Moved to Survey' },
  { key: 'survey_date', step: 'Survey Date' },
  { key: 'in_design_date', step: 'Moved to Design' },
  { key: 'design_deadline', step: 'Design Deadline' },
  { key: 'in_review_date', step: 'Moved to Review' },
  { key: 'close_date', step: 'Project Closed' },
  { key: 'lost_date', step: 'Project Lost' },
  { key: 'updatedAt', step: 'Last Update' },
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

const getTimelineEvents = (lead) => {
  const events = [];

  STAGE_DATE_FIELDS.forEach((field) => {
    const date = getDateObject(lead?.[field.key]);
    if (!date) return;

    const details = [];
    if (field.key === 'survey_date' && lead?.surveyor) details.push(`Surveyor: ${lead.surveyor}`);
    if (field.key === 'design_deadline' && lead?.designer) details.push(`Designer: ${lead.designer}`);
    if (field.key === 'close_date' && lead?.final_price) details.push(`Final Price: ${formatCurrencyGBP(lead.final_price)}`);

    events.push({
      type: 'step',
      title: field.step,
      sortKey: field.key,
      date,
      dateText: formatLondonDateTime(date),
      details,
    });
  });

  (lead?.payment_history || []).forEach((payment) => {
    const date = getDateObject(payment?.paid_at);
    if (!date) return;
    const detail = [
      `Paid: ${formatCurrencyGBP(payment?.paid_amount || 0)}`,
      payment?.discount_given ? `Discount: ${formatCurrencyGBP(payment.discount_given)}` : null,
      payment?.agent ? `By: ${payment.agent}` : null,
      payment?.stage ? `Stage: ${payment.stage}` : null,
      payment?.note ? `Note: ${stripHtml(payment.note)}` : null,
    ].filter(Boolean);

    events.push({
      type: 'payment',
      title: 'Payment Update',
      sortKey: 'payment',
      date,
      dateText: formatLondonDateTime(date),
      details: detail,
    });
  });

  const descriptionText = stripHtml(lead?.description || '');
  if (descriptionText) {
    events.push({
      type: 'note',
      title: 'Project Notes',
      sortKey: 'note',
      date: getDateObject(lead?.updatedAt) || getDateObject(lead?.createdAt) || new Date(),
      dateText: formatLondonDateTime(lead?.updatedAt || lead?.createdAt),
      details: descriptionText.split('\n').filter(Boolean).slice(0, 10),
      fullDescription: descriptionText,
    });
  }

  return events.sort((a, b) => {
    // Keep lifecycle anchor always at bottom, regardless of time formatting anomalies.
    if (a.sortKey === 'createdAt' && b.sortKey !== 'createdAt') return 1;
    if (b.sortKey === 'createdAt' && a.sortKey !== 'createdAt') return -1;
    return b.date - a.date;
  });
};

const getMatchedLeads = (leads, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return leads.filter((item) => String(item?.leadCode || '').toLowerCase().includes(q));
};

const getStepJourney = (lead) => {
  const steps = STAGE_DATE_FIELDS
    .filter((field) => field.key !== 'updatedAt')
    .map((field) => {
      const date = getDateObject(lead?.[field.key]);
      if (!date) return null;
      return {
        key: field.key,
        step: field.step,
        date,
        dateText: formatLondonDateTime(date),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);

  return steps;
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

  const timeline = useMemo(() => (selectedLead ? getTimelineEvents(selectedLead) : []), [selectedLead]);
  const stepJourney = useMemo(() => (selectedLead ? getStepJourney(selectedLead) : []), [selectedLead]);

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

    const doc = new jsPDF();
    const statusLabel = STATUS_LABELS[selectedLead.status] || selectedLead.status || 'N/A';
    const header = [
      ['Project Code', selectedLead.leadCode || 'N/A'],
      ['Current Status', statusLabel],
      ['Current Step', selectedLead.stage || 'N/A'],
      ['Client', selectedLead.client?.name || 'N/A'],
      ['Company', selectedLead.company || selectedLead.client?.company || 'N/A'],
      ['Address', selectedLead.address || 'N/A'],
      ['Agent', selectedLead.agent || 'N/A'],
      ['Quote Price', formatCurrencyGBP(selectedLead.quote_price || 0)],
      ['Final Price', formatCurrencyGBP(selectedLead.final_price || 0)],
      ['Created At', formatLondonDateTime(selectedLead.createdAt)],
      ['Last Updated', formatLondonDateTime(selectedLead.updatedAt)],
    ];

    doc.setFontSize(17);
    doc.text('Project History Report', 14, 16);
    doc.setFontSize(11);
    doc.text(`Generated: ${formatLondonDateTime(new Date())}`, 14, 23);

    autoTable(doc, {
      startY: 28,
      head: [['Field', 'Value']],
      body: header,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2.3 },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: { 0: { cellWidth: 42 } },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      head: [['Date', 'Step', 'Type', 'Details']],
      body: timeline.map((item) => [
        item.dateText,
        item.title,
        item.type,
        (item.details || []).join(' | ').slice(0, 2000),
      ]),
      theme: 'striped',
      styles: { fontSize: 8.3, valign: 'top' },
      headStyles: { fillColor: [30, 64, 175] },
    });

    const notes = stripHtml(selectedLead.description || '');
    if (notes) {
      const notesY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(11);
      doc.text('Full Description Notes', 14, notesY);
      doc.setFontSize(9.3);
      const wrapped = doc.splitTextToSize(notes, 180);
      doc.text(wrapped, 14, notesY + 5);
    }

    doc.save(`${selectedLead.leadCode || 'project'}-history.pdf`);
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-84px)] bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 p-4 md:p-6">
        <ToastContainer position="top-right" autoClose={2500} />

        <div className="mx-auto w-full max-w-7xl space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm backdrop-blur md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
                  <HistoryEduIcon /> Project History
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Search by project code and view full step-by-step history with date and details.
                </p>
              </div>

              <button
                type="button"
                onClick={downloadPdf}
                disabled={!selectedLead}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <DownloadIcon fontSize="small" /> Download Full PDF
              </button>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fontSize="small" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLeads()}
                  placeholder="Enter project code, e.g. CIC-123ABC"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="button"
                onClick={fetchLeads}
                disabled={loading}
                className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {hasFetched && !matchedLeads.length && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
              No project found for code: <b>{query}</b>
            </div>
          )}

          {!!matchedLeads.length && (
            <>
              {matchedLeads.length > 1 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-semibold text-slate-700">Multiple matches found ({matchedLeads.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {matchedLeads.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => setSelectedLeadId(item._id)}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition ${selectedLead?._id === item._id
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-blue-500 hover:text-blue-700'
                          }`}
                      >
                        {item.leadCode}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 xl:grid-cols-[40%_60%]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                        <CalendarMonthIcon fontSize="small" /> Step Journey
                      </h2>
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                        Oldest to latest
                      </span>
                    </div>

                    <div className="space-y-3">
                      {stepJourney.map((item, index) => (
                        <div key={`${item.key}-${item.dateText}-${index}`} className="relative rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3.5 pl-10">
                          <span className="absolute left-4 top-0 h-full w-px bg-slate-200" />
                          <span className="absolute left-[11px] top-4 h-2.5 w-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100" />
                          <p className="text-[14px] font-semibold text-slate-800">{item.step}</p>
                          <p className="mt-1 inline-block rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-white">{item.dateText}</p>
                        </div>
                      ))}
                      {!stepJourney.length && (
                        <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                          No step history found.
                        </div>
                      )}
                    </div>
                  </div>

                  <InfoCard icon={<PersonIcon fontSize="small" />} title="Client Full Information">
                    <InfoRow label="Client Name" value={selectedLead.client?.name || 'N/A'} />
                    <InfoRow label="Client Phone" value={selectedLead.client?.phone || 'N/A'} />
                    <InfoRow label="Client Email" value={selectedLead.client?.email || 'N/A'} />
                    <InfoRow label="Client Company" value={selectedLead.client?.company || selectedLead.company || 'N/A'} />
                    <InfoRow label="Project Address" value={selectedLead.address || 'N/A'} />
                  </InfoCard>

                  <InfoCard icon={<TaskAltIcon fontSize="small" />} title="Project Snapshot">
                    <InfoRow label="Project Code" value={selectedLead.leadCode} />
                    <InfoRow label="Status" value={STATUS_LABELS[selectedLead.status] || selectedLead.status} />
                    <InfoRow label="Current Step" value={selectedLead.stage || 'N/A'} />
                    <InfoRow label="Company" value={selectedLead.company || selectedLead.client?.company || 'N/A'} />
                    <InfoRow label="Agent" value={selectedLead.agent || 'N/A'} />
                    <InfoRow label="Source" value={selectedLead.source || 'N/A'} />
                  </InfoCard>

                  <InfoCard icon={<LocationOnIcon fontSize="small" />} title="Location & Budget">
                    <InfoRow label="Address" value={selectedLead.address || 'N/A'} />
                    <InfoRow label="Quote Price" value={formatCurrencyGBP(selectedLead.quote_price || 0)} />
                    <InfoRow label="Final Price" value={formatCurrencyGBP(selectedLead.final_price || 0)} />
                    <InfoRow label="Created At" value={formatLondonDateTime(selectedLead.createdAt)} />
                  </InfoCard>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                    <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-800">
                      <CorporateFareIcon fontSize="small" /> Project Details
                    </h2>
                    <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                      <DetailLine label="Service Type" value={selectedLead.service_type} />
                      <DetailLine label="Project Type" value={selectedLead.project_type} />
                      <DetailLine label="Surveyor" value={selectedLead.surveyor} />
                      <DetailLine label="Designer" value={selectedLead.designer} />
                      <DetailLine label="Survey Done" value={selectedLead.survey_done} />
                    </div>
                  </div>

                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                    <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-800">
                      <PersonIcon fontSize="small" /> Full Project Description
                    </h2>
                    <div className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                      {stripHtml(selectedLead.description || '') || 'No detailed description found.'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                    <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-800">
                      <CorporateFareIcon fontSize="small" /> Project Details
                    </h2>
                    <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                      <DetailLine label="Service Type" value={selectedLead.service_type} />
                      <DetailLine label="Project Type" value={selectedLead.project_type} />
                      <DetailLine label="Surveyor" value={selectedLead.surveyor} />
                      <DetailLine label="Designer" value={selectedLead.designer} />
                      <DetailLine label="Survey Done" value={selectedLead.survey_done} />
                    </div>
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

function InfoCard({ icon, title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-slate-800">
        {icon} {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value || 'N/A'}</p>
    </div>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-xs text-slate-500">{label}:</span>{' '}
      <span className="font-semibold text-slate-800">{value || 'N/A'}</span>
    </div>
  );
}
