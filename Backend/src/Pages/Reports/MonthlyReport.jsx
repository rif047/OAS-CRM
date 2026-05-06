import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BusinessIcon from '@mui/icons-material/Business';
import RouteIcon from '@mui/icons-material/Route';
import SummarizeIcon from '@mui/icons-material/Summarize';
import SummarizeRoundedIcon from '@mui/icons-material/SummarizeRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import Layout from '../../Layout';
import Datatable from '../../Components/Datatable/Datatable';
import View from '../Lead/View';
import { formatLondonDateTime } from '../../utils/formatters';
import 'react-toastify/dist/ReactToastify.css';

const STAGE_OPTIONS = [
  { label: 'All', value: 'All' },
  { label: 'Pending', value: 'Pending' },
  { label: 'In Quote', value: 'In_Quote' },
  { label: 'In Survey', value: 'In_Survey' },
  { label: 'In Design', value: 'In_Design' },
  { label: 'In Review', value: 'In_Review' },
  { label: 'Closed', value: 'Closed' },
  { label: 'Lost Lead', value: 'Lost_Lead' },
];

const STATUS_LABEL = {
  Pending: 'Pending',
  In_Quote: 'In Quote',
  In_Survey: 'In Survey',
  In_Design: 'In Design',
  In_Review: 'In Review',
  Closed: 'Closed',
  Lost_Lead: 'Lost Lead',
};

export default function MonthlyReport() {
  document.title = 'Monthly Report';

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');

  const [companies, setCompanies] = useState([]);
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    in_quote: 0,
    in_survey: 0,
    in_design: 0,
    in_review: 0,
    closed: 0,
    lost_lead: 0,
  });

  const [loading, setLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const fromDateRef = useRef(null);
  const toDateRef = useRef(null);

  const columns = useMemo(
    () => [
      {
        header: 'Date',
        accessorFn: (row) => row.report_date || row.createdAt || '',
        Cell: ({ row }) => row.original?.report_date || formatLondonDateTime(row.original?.createdAt),
        size: 80,
        maxSize: 80,
      },
      {
        header: 'Code',
        accessorKey: 'leadCode',
        size: 80,
        maxSize: 80,
      },
      {
        header: 'Client',
        accessorFn: (row) => {
          const clientName = row.client?.name || 'N/A';
          const clientCompany = row.client?.company || '';
          return clientCompany ? `${clientName} (${clientCompany})` : clientName;
        },
      },
      {
        header: 'Company',
        accessorFn: (row) => row.company || 'N/A',
      },
      {
        header: 'Project Type',
        accessorFn: (row) => row.project_type || 'N/A',
      },
    ],
    []
  );

  const fetchReport = async () => {
    if (!fromDate || !toDate) {
      toast.error('From date and To date are required.');
      return;
    }
    if (fromDate > toDate) {
      toast.error('From date cannot be after To date.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/leads/monthly/report`, {
        params: {
          from: fromDate,
          to: toDate,
          company: selectedCompany,
          stage: selectedStage,
        },
      });

      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setCounts(data?.counts || {});
      setCompanies(Array.isArray(data?.companies) ? data.companies : []);
    } catch (error) {
      toast.error(error?.response?.data || 'Failed to load monthly report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Keep initial page clean: no validation toast until user generates report.
    setRows([]);
    setCounts({
      all: 0,
      pending: 0,
      in_quote: 0,
      in_survey: 0,
      in_design: 0,
      in_review: 0,
      closed: 0,
      lost_lead: 0,
    });
  }, []);

  const handleView = (row) => {
    setViewData(row);
    setViewOpen(true);
  };

  const downloadReportPdf = () => {
    if (!rows.length) {
      toast.info('No data to download. Generate a report first.');
      return;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const generatedAt = formatLondonDateTime(new Date());
    const stageLabel = STAGE_OPTIONS.find((item) => item.value === selectedStage)?.label || selectedStage;

    doc.setFontSize(16);
    doc.text('Monthly Report', 14, 16);
    doc.setFontSize(9.5);
    doc.text(`From: ${fromDate || 'N/A'}    To: ${toDate || 'N/A'}`, 14, 23);
    doc.text(`Company: ${selectedCompany || 'All'}    Stage: ${stageLabel || 'All'}`, 14, 28);
    doc.text(`Generated: ${generatedAt}`, 14, 33);

    autoTable(doc, {
      startY: 38,
      head: [['Total', 'Pending', 'In Quote', 'In Survey', 'In Design', 'In Review', 'Closed', 'Lost Lead']],
      body: [[
        counts.all || 0,
        counts.pending || 0,
        counts.in_quote || 0,
        counts.in_survey || 0,
        counts.in_design || 0,
        counts.in_review || 0,
        counts.closed || 0,
        counts.lost_lead || 0,
      ]],
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    });

    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY || 38) + 6,
      head: [['Date', 'Code', 'Company', 'Client (Company)', 'Project Type']],
      body: rows.map((row) => {
        const clientName = row?.client?.name || 'N/A';
        const clientCompany = row?.client?.company ? ` (${row.client.company})` : '';
        return [
          row.report_date || '',
          row.leadCode || '',
          row.company || '',
          `${clientName}${clientCompany}`,
          row.project_type || '',
        ];
      }),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 1.8, overflow: 'linebreak' },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 24 },
        2: { cellWidth: 35 },
        3: { cellWidth: 63 },
        4: { cellWidth: 40 },
      },
    });

    doc.save(`monthly-report-${fromDate || 'from'}-to-${toDate || 'to'}.pdf`);
  };

  const summaryCards = [
    { label: 'Total', value: counts.all || 0 },
    { label: 'Pending', value: counts.pending || 0 },
    { label: 'In Quote', value: counts.in_quote || 0 },
    { label: 'In Survey', value: counts.in_survey || 0 },
    { label: 'In Design', value: counts.in_design || 0 },
    { label: 'In Review', value: counts.in_review || 0 },
    { label: 'Closed', value: counts.closed || 0 },
    { label: 'Lost Lead', value: counts.lost_lead || 0 },
  ];

  return (
    <Layout>
      <div className="min-h-[calc(100vh-84px)] bg-[linear-gradient(145deg,#f8fbff_0%,#edf4ff_45%,#f5f8ff_100%)] p-3 md:p-4">
        <ToastContainer position="top-right" autoClose={2500} />

        <div className="w-full space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 md:text-[26px]">
              <SummarizeIcon fontSize="small" /> Monthly Report
            </h1>
            <p className="mt-0.5 text-sm text-slate-600">
              Filter by date range, company and stage to see accurate project report with full details.
            </p>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-600">From Date</span>
                <div
                  className="relative cursor-pointer"
                  onClick={() => {
                    fromDateRef.current?.showPicker?.();
                    fromDateRef.current?.focus?.();
                  }}
                >
                  <CalendarMonthIcon className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" fontSize="small" />
                  <input
                    ref={fromDateRef}
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-2 text-sm outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-600">To Date</span>
                <div
                  className="relative cursor-pointer"
                  onClick={() => {
                    toDateRef.current?.showPicker?.();
                    toDateRef.current?.focus?.();
                  }}
                >
                  <CalendarMonthIcon className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" fontSize="small" />
                  <input
                    ref={toDateRef}
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-2 text-sm outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-600">Company</span>
                <div className="relative">
                  <BusinessIcon className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" fontSize="small" />
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white pl-9 pr-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="All">All Companies</option>
                    {companies.map((company) => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-600">Stage</span>
                <div className="relative">
                  <RouteIcon className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" fontSize="small" />
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white pl-9 pr-2 text-sm outline-none focus:border-blue-500"
                  >
                    {STAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <div className="mt-[22px] grid grid-cols-1 gap-2 sm:grid-cols-2 xl:col-span-2">
                <button
                  type="button"
                  onClick={fetchReport}
                  disabled={loading}
                  className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <SummarizeRoundedIcon sx={{ fontSize: 18, color: '#bfdbfe' }} />
                  {loading ? 'Loading...' : 'Generate Report'}
                </button>
                <button
                  type="button"
                  onClick={downloadReportPdf}
                  className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                >
                  <FileDownloadRoundedIcon sx={{ fontSize: 18, color: '#059669' }} /> Download Report
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <Datatable
              columns={columns}
              data={rows}
              onView={handleView}
              onEdit={() => {}}
              onDelete={() => {}}
              permissions={{ canView: true, canEdit: false, canDelete: false }}
              defaultPageSize={50}
              forceDefaultPageSize
            />
          </div>
        </div>
      </div>

      <View open={viewOpen} onClose={() => setViewOpen(false)} viewData={viewData} />
    </Layout>
  );
}
