import { Fragment, useMemo, useRef, useState } from 'react';
import Layout from '../../Layout';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import SummarizeRoundedIcon from '@mui/icons-material/SummarizeRounded';
import SummarizeIcon from '@mui/icons-material/Summarize';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyGBP, formatLondonDateTime } from '../../utils/formatters';

const getCompanyName = (row) => row?.company || '';
const getClientCompanyName = (row) => row?.client?.company || '';

const DateField = ({ value, onChange, placeholder }) => {
  const inputRef = useRef(null);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      el.showPicker();
      return;
    }
    el.focus();
    el.click();
  };

  return (
    <div
      className="h-9 min-w-[150px] cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm"
      onClick={openPicker}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      }}
      title={placeholder}
    >
      <input
        ref={inputRef}
        type="date"
        className="h-full w-full cursor-pointer bg-transparent text-sm text-slate-700 outline-none"
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default function Income() {
  document.title = 'Income & Due';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('All Company');
  const [canDownloadReport, setCanDownloadReport] = useState(false);
  const [isCompanyEnabled, setIsCompanyEnabled] = useState(false);

  const companies = useMemo(() => {
    const unique = new Set();
    for (const row of rows) {
      const companyName = getCompanyName(row);
      if (companyName) unique.add(companyName);
    }
    return ['All Company', ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (selectedCompany === 'All Company') return rows;
    return rows.filter((row) => getCompanyName(row) === selectedCompany);
  }, [rows, selectedCompany]);

  const groupedProjects = useMemo(() => {
    const groups = new Map();
    for (const row of filteredRows) {
      const key = row?.code || '__NO_CODE__';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }

    const grouped = [];
    for (const [code, items] of groups.entries()) {
      grouped.push({ code, items });
    }
    return grouped;
  }, [filteredRows]);

  const summary = useMemo(() => {
    const projectMap = new Map();
    let received = 0;

    for (const row of filteredRows) {
      const key = row?.code || row?._id;
      if (!projectMap.has(key)) {
        projectMap.set(key, {
          quoted: Number(row?.quoted_amount) || 0,
          due: Number(row?.due) || 0,
        });
      }
      received += Number(row?.amount) || 0;
    }

    let quoted = 0;
    let duePending = 0;
    for (const project of projectMap.values()) {
      quoted += project.quoted;
      duePending += project.due;
    }

    return { quoted, received, duePending };
  }, [filteredRows]);

  const load = async () => {
    if (!from || !to) return toast.error('Please select both From and To dates.');
    try {
      const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/leads/income/report`, { params: { from, to } });
      setRows(res.data.rows || []);
      setSelectedCompany('All Company');
      setIsCompanyEnabled(true);
      setCanDownloadReport(true);
    } catch {
      setIsCompanyEnabled(false);
      setCanDownloadReport(false);
      toast.error('Report load failed.');
    }
  };

  const downloadReportPdf = () => {
    if (!groupedProjects.length) {
      toast.error('No report data to download.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const reportTitle = 'Income & Due Report';
    const dateRange = `${from || '-'} to ${to || '-'}`;
    const companyLabel = selectedCompany || 'All Company';

    doc.setFontSize(16);
    doc.setTextColor(23, 37, 84);
    doc.text(reportTitle, 40, 36);

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date Range: ${dateRange}`, 40, 54);
    doc.text(`Company: ${companyLabel}`, 40, 69);

    doc.setTextColor(15, 23, 42);
    doc.text(`Total Quoted: ${formatCurrencyGBP(summary.quoted)}`, 300, 54);
    doc.text(`Total Received: ${formatCurrencyGBP(summary.received)}`, 300, 69);
    doc.text(`Due Pending: ${formatCurrencyGBP(summary.duePending)}`, 520, 69);

    const body = [];
    for (const group of groupedProjects) {
      body.push([
        {
          content: `Project: ${group.code || '-'}`,
          colSpan: 6,
          styles: {
            fillColor: [226, 232, 240],
            textColor: [30, 41, 59],
            fontStyle: 'bold',
          },
        },
      ]);

      const companyName = getClientCompanyName(group.items[0]);
      for (const row of group.items) {
        body.push([
          formatLondonDateTime(row.paid_at),
          `${row.client?.name || '-'}${companyName ? ` (${companyName})` : ''}`,
          row.project_type || '-',
          formatCurrencyGBP(row.quoted_amount || 0),
          formatCurrencyGBP(row.due || 0),
          formatCurrencyGBP(row.amount || 0),
        ]);
      }
    }

    autoTable(doc, {
      startY: 84,
      head: [['Date', 'Client', 'Project Type', 'Quoted', 'Due', 'Received']],
      body,
      styles: {
        fontSize: 8.5,
        cellPadding: 5,
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
      },
      theme: 'grid',
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 230 },
        2: { cellWidth: 150 },
        3: { halign: 'right', cellWidth: 90 },
        4: { halign: 'right', cellWidth: 80 },
        5: { halign: 'right', cellWidth: 90 },
      },
      didDrawPage: () => {
        const pageCount = doc.getNumberOfPages();
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Generated on ${new Date().toLocaleString()}`, 40, pageHeight - 18);
        doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`, pageSize.getWidth() - 110, pageHeight - 18);
      },
    });

    const safeCompany = companyLabel.replace(/[^a-z0-9-_]/gi, '_');
    doc.save(`income_due_report_${safeCompany}_${from || 'from'}_${to || 'to'}.pdf`);
  };

  return (
    <Layout>
      <ToastContainer position="bottom-right" autoClose={2000} />
      <section className="leadPageShell bg-white">
        <div className="mb-2 rounded-xl border border-slate-200 bg-linear-to-r from-[#3a4259] to-[#475569] px-3 py-2 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="shrink-0 xl:min-w-[290px]">
              <h1 className="flex items-center gap-2 text-xl font-bold text-white md:text-[26px]">
                <SummarizeIcon fontSize="small" sx={{ color: '#bfdbfe' }} /> Income &amp; Due
              </h1>
              <p className="mt-0.5 text-sm text-slate-200">Track quotation, received amount, and due from a single report view.</p>
            </div>
            <div
              className="flex flex-wrap gap-2 xl:ml-auto xl:items-center xl:justify-end"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  load();
                }
              }}
            >
            <DateField value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From date" />
            <DateField value={to} onChange={(e) => setTo(e.target.value)} placeholder="To date" />
            <div title={!isCompanyEnabled ? 'Generate report first' : ''}>
              <select
                className="h-9 min-w-[150px] cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                disabled={!isCompanyEnabled}
              >
                {companies.map((company) => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
            <button
              onClick={load}
              className="inline-flex h-[38px] min-w-[170px] items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 text-sm font-semibold leading-none text-white shadow-sm transition hover:bg-slate-800 cursor-pointer"
            >
              <SummarizeRoundedIcon sx={{ fontSize: 18, color: '#bfdbfe' }} />
              Generate Report
            </button>
            <button
              onClick={downloadReportPdf}
              disabled={!canDownloadReport}
              className="inline-flex h-[36px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold leading-none text-slate-800 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <FileDownloadRoundedIcon sx={{ fontSize: 18, color: '#059669' }} />
              Download Report
            </button>
            </div>
          </div>
        </div>

        <div className="mb-2 px-2 md:px-3">
          <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded-lg border border-sky-100 bg-linear-to-br from-sky-50 to-white p-3 shadow-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">Total Quoted</p>
            <p className="mt-1 text-xl font-bold text-sky-900">{formatCurrencyGBP(summary.quoted)}</p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-linear-to-br from-emerald-50 to-white p-3 shadow-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Total Received</p>
            <p className="mt-1 text-xl font-bold text-emerald-800">{formatCurrencyGBP(summary.received)}</p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-linear-to-br from-amber-50 to-white p-3 shadow-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Due Pending</p>
            <p className="mt-1 text-xl font-bold text-amber-800">{formatCurrencyGBP(summary.duePending)}</p>
          </div>
          </div>
        </div>

        <div className="leadPageTableWrap p-0 overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left font-semibold">Date</th>
                <th className="p-2 text-left font-semibold">Client</th>
                <th className="p-2 text-left font-semibold">Project Type</th>
                <th className="p-2 text-center font-semibold">Quoted</th>
                <th className="p-2 text-center font-semibold">Due</th>
                <th className="p-2 text-center font-semibold">Received</th>
              </tr>
            </thead>
            <tbody>
              {groupedProjects.map((group, groupIndex) => {
                const first = group.items[0];
                const companyName = getClientCompanyName(first);
                return (
                  <Fragment key={`group-wrap-${group.code}-${groupIndex}`}>
                    <tr key={`group-${group.code}-${groupIndex}`} className="border-t border-slate-300 bg-slate-200/70">
                      <td className="px-2 py-1.5 text-xs font-semibold text-slate-700" colSpan={6}>
                        Project: <span className="text-slate-900">{group.code || '-'}</span>
                      </td>
                    </tr>

                    {group.items.map((r, rowIndex) => (
                      <tr key={`row-${group.code}-${rowIndex}-${r.paid_at || rowIndex}`} className="border-t border-slate-200 bg-white">
                        <td className="p-2">{formatLondonDateTime(r.paid_at)}</td>
                        <td className="p-2">
                          {r.client?.name || '-'}
                          {companyName ? ` (${companyName})` : ''}
                        </td>
                        <td className="p-2">{r.project_type || '-'}</td>
                        <td className="p-2 text-center">{formatCurrencyGBP(r.quoted_amount || 0)}</td>
                        <td className="p-2 text-center">{formatCurrencyGBP(r.due || 0)}</td>
                        <td className="p-2 text-center">{formatCurrencyGBP(r.amount)}</td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
