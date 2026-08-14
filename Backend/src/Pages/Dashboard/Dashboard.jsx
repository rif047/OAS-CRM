import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { NavLink } from "react-router-dom";
import Layout from "../../Layout";
import CachedIcon from "@mui/icons-material/Cached";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CurrencyPoundIcon from "@mui/icons-material/CurrencyPound";
import Groups2Icon from "@mui/icons-material/Groups2";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Cell,
    Legend,
    LineChart,
    Line,
} from "recharts";
import { formatCurrencyGBP, formatLondonDateShort, formatLondonDateTime } from "../../utils/formatters";
const ALL_COMPANIES_OPTION = "All Companies";

const parseDate = (value) => {
    if (!value) return null;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value) => {
    const parsed = parseDate(value);
    if (!parsed) return "N/A";
    return formatLondonDateShort(parsed);
};

function MeasuredChart({ height, children }) {
    const containerRef = useRef(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return undefined;

        let frame = 0;
        const updateSize = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                setWidth(el.clientWidth || 0);
            });
        };

        updateSize();
        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(el);

        return () => {
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <div ref={containerRef} className="min-w-0" style={{ height }}>
            {width > 0 ? children(width, height) : null}
        </div>
    );
}

export default function Dashboard() {
    document.title = "Dashboard";

    const userType = localStorage.getItem("userType");
    const canAccess = userType === "Admin" || userType === "Management";

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [dashboardData, setDashboardData] = useState({ companyOptions: [ALL_COMPANIES_OPTION], metrics: null });
    const [lastUpdated, setLastUpdated] = useState(null);
    const [selectedCompany, setSelectedCompany] = useState(ALL_COMPANIES_OPTION);

    const fallbackMetrics = {
        currentMonthKey: "",
        currentMonthLabelShort: "N/A",
        totalClients: 0,
        totalClientsRunningMonth: 0,
        totalUsers: 0,
        usersByType: {},
        topCompanies: [],
        pipelineRunningMonthChart: [],
        pipelineOverallChart: [],
        pipelineRunningMonthTotal: 0,
        teamChart: [],
        financeTrend: [],
        winRateTrend: [],
        sixMonthWinRate: "0.0",
        sixMonthClosed: 0,
        sixMonthLost: 0,
        overallWinRate: "0.0",
        overallClosed: 0,
        overallLost: 0,
        runningMonthWinRate: "0.0",
        runningMonthClosed: 0,
        runningMonthLost: 0,
        receivedThisMonth: 0,
        quotedThisMonth: 0,
        dueThisMonth: 0,
        receivedOverall: 0,
        dueOverall: 0,
        upcomingDeadlines: [],
    };

    const loadDashboard = async (company = selectedCompany) => {
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/leads/dashboard/admin`, {
                params: company && company !== ALL_COMPANIES_OPTION ? { company } : {},
            });
            setDashboardData({
                companyOptions: Array.isArray(res.data?.companyOptions) ? res.data.companyOptions : [ALL_COMPANIES_OPTION],
                metrics: res.data?.metrics || fallbackMetrics,
            });
            setLastUpdated(new Date());
        } catch {
            setError("Unable to load dashboard data. Please refresh.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (canAccess) {
            loadDashboard(selectedCompany);
        }
    }, [canAccess, selectedCompany]);

    const companyOptions = dashboardData.companyOptions || [ALL_COMPANIES_OPTION];

    useEffect(() => {
        if (selectedCompany === ALL_COMPANIES_OPTION) return;
        if (!companyOptions.includes(selectedCompany)) {
            setSelectedCompany(ALL_COMPANIES_OPTION);
        }
    }, [companyOptions, selectedCompany]);

    const metrics = dashboardData.metrics || fallbackMetrics;

    if (!canAccess) {
        return (
            <Layout>
                <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-red-800">
                    Dashboard access is limited to Admin and Management users.
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <section className="space-y-4 pb-2">
                <div className="overflow-hidden rounded-xl border border-[#48506a] bg-linear-to-r from-[#4c5165] to-[#2f3548] shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-5">
                        <div>
                            <h1 className="text-xl font-bold text-white">Dashboard</h1>
                            <p className="text-sm text-gray-200">
                                Admin &amp; management overview: pipeline, income and delivery.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {lastUpdated && (
                                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-gray-100">
                                    Updated: {formatLondonDateTime(lastUpdated)}
                                </span>
                            )}
                            <select
                                value={selectedCompany}
                                onChange={(e) => setSelectedCompany(e.target.value)}
                                className="h-9 min-w-[170px] cursor-pointer rounded-lg border border-white/30 bg-white/10 px-3 text-sm font-semibold text-white outline-none transition hover:bg-white/20"
                                title="Filter dashboard by company"
                            >
                                {companyOptions.map((company) => (
                                    <option key={company} value={company} className="text-slate-900">
                                        {company}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={loadDashboard}
                                disabled={loading}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <CachedIcon className={loading ? "animate-spin" : ""} fontSize="small" />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></span>
                        Loading latest dashboard metrics...
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-700">
                            <CurrencyPoundIcon fontSize="small" />
                            <p className="text-sm font-semibold">Income</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-md bg-slate-50 px-2 py-2">
                                <p className="text-[11px] font-semibold text-slate-600">Running Month ({metrics.currentMonthLabelShort})</p>
                                <p className="text-2xl font-bold text-slate-900">{formatCurrencyGBP(metrics.receivedThisMonth)}</p>
                            </div>
                            <div className="rounded-md bg-slate-50 px-2 py-2">
                                <p className="text-[11px] font-semibold text-slate-600">Overall</p>
                                <p className="text-2xl font-bold text-slate-900">{formatCurrencyGBP(metrics.receivedOverall)}</p>
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Received income (paid entries only)</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-700">
                            <CurrencyPoundIcon fontSize="small" />
                            <p className="text-sm font-semibold">Due</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-md bg-slate-50 px-2 py-2">
                                <p className="text-[11px] font-semibold text-slate-600">Running Month ({metrics.currentMonthLabelShort})</p>
                                <p className="text-2xl font-bold text-slate-900">{formatCurrencyGBP(metrics.dueThisMonth)}</p>
                            </div>
                            <div className="rounded-md bg-slate-50 px-2 py-2">
                                <p className="text-[11px] font-semibold text-slate-600">Overall</p>
                                <p className="text-2xl font-bold text-slate-900">{formatCurrencyGBP(metrics.dueOverall)}</p>
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Pending due amount</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-700">
                            <TrendingUpIcon fontSize="small" />
                            <p className="text-sm font-semibold">Win Rate</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-md bg-slate-50 px-2 py-2">
                                <p className="text-[11px] font-semibold text-slate-600">Running Month ({metrics.currentMonthLabelShort})</p>
                                <p className="text-2xl font-bold text-slate-900">{metrics.runningMonthWinRate}%</p>
                                <p className="text-[11px] text-slate-500">C {metrics.runningMonthClosed} | L {metrics.runningMonthLost}</p>
                            </div>
                            <div className="rounded-md bg-slate-50 px-2 py-2">
                                <p className="text-[11px] font-semibold text-slate-600">Overall</p>
                                <p className="text-2xl font-bold text-slate-900">{metrics.overallWinRate}%</p>
                                <p className="text-[11px] text-slate-500">C {metrics.overallClosed} | L {metrics.overallLost}</p>
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Closed vs Lost conversion rate</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-700">
                            <Groups2Icon fontSize="small" />
                            <p className="text-sm font-semibold">Client</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-md bg-slate-50 px-2 py-2">
                                <p className="text-[11px] font-semibold text-slate-600">Running Month ({metrics.currentMonthLabelShort})</p>
                                <p className="text-2xl font-bold text-slate-900">{metrics.totalClientsRunningMonth}</p>
                            </div>
                            <div className="rounded-md bg-slate-50 px-2 py-2">
                                <p className="text-[11px] font-semibold text-slate-600">Overall</p>
                                <p className="text-2xl font-bold text-slate-900">{metrics.totalClients}</p>
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">({metrics.currentMonthLabelShort}) and lifetime client count</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-3">
                            <h2 className="text-base font-bold text-gray-900">Pipeline Distribution</h2>
                            <p className="text-xs text-gray-500">Running month vs overall status distribution.</p>
                        </div>
                        <div className="relative grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5">
                            <div className="rounded-lg border border-slate-200/90 bg-slate-50/40 p-3">
                                <p className="mb-2 text-xs font-semibold text-gray-600">Running Month ({metrics.currentMonthLabelShort})</p>
                                <MeasuredChart height={280}>
                                    {(width, height) => (
                                        <BarChart width={width} height={height} data={metrics.pipelineRunningMonthChart} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                                            <YAxis
                                                type="category"
                                                dataKey="name"
                                                width={120}
                                                tick={{ fontSize: 12 }}
                                                tickFormatter={(value) => value.replace(" ", "\u00A0")}
                                            />
                                            <Tooltip />
                                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                                {metrics.pipelineRunningMonthChart.map((item) => (
                                                    <Cell key={item.name} fill={item.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    )}
                                </MeasuredChart>
                            </div>

                            <div className="hidden lg:block pointer-events-none absolute left-1/2 top-1 bottom-1 w-px -translate-x-1/2 bg-linear-to-b from-transparent via-slate-300 to-transparent" />

                            <div className="rounded-lg border border-slate-200/90 bg-white p-3">
                                <p className="mb-2 text-xs font-semibold text-gray-600">Overall</p>
                                <MeasuredChart height={280}>
                                    {(width, height) => (
                                        <BarChart width={width} height={height} data={metrics.pipelineOverallChart} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                                            <YAxis
                                                type="category"
                                                dataKey="name"
                                                width={120}
                                                tick={{ fontSize: 12 }}
                                                tickFormatter={(value) => value.replace(" ", "\u00A0")}
                                            />
                                            <Tooltip />
                                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                                {metrics.pipelineOverallChart.map((item) => (
                                                    <Cell key={item.name} fill={item.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    )}
                                </MeasuredChart>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2">
                            <h2 className="text-base font-bold text-gray-900">Income Snapshot (Last 6 Months)</h2>
                            <p className="text-xs text-gray-500">Quoted, received, and due amount trend (GBP).</p>
                        </div>
                        <MeasuredChart height={290}>
                            {(width, height) => (
                                <BarChart width={width} height={height} data={metrics.financeTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip formatter={(value) => formatCurrencyGBP(value)} />
                                    <Legend />
                                    <Bar dataKey="quoted" name="Quoted" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="received" name="Received" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="due" name="Due" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            )}
                        </MeasuredChart>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2">
                            <h2 className="text-base font-bold text-gray-900">Win Rate Trend (Last 6 Months)</h2>
                            <p className="text-xs text-gray-500">Monthly win % from closed vs lost projects.</p>
                        </div>
                        <MeasuredChart height={260}>
                            {(width, height) => (
                                <LineChart width={width} height={height} data={metrics.winRateTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        formatter={(value, key) => {
                                            if (key === "winRate") return `${value}%`;
                                            return value;
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="closed" name="Closed" fill="#22c55e" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="lost" name="Lost" fill="#ef4444" radius={[3, 3, 0, 0]} />
                                    <Line type="monotone" dataKey="winRate" name="Win Rate %" stroke="#334155" strokeWidth={2} />
                                </LineChart>
                            )}
                        </MeasuredChart>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-4 py-3">
                            <h2 className="text-base font-bold text-gray-900">Upcoming Deadlines</h2>
                            <p className="text-xs text-gray-500">Survey and drawing phase schedule.</p>
                        </div>
                        <div className="max-h-[340px] overflow-auto px-4 py-2">
                            {metrics.upcomingDeadlines.length === 0 ? (
                                <p className="py-6 text-sm text-gray-500">No scheduled deadlines available.</p>
                            ) : (
                                metrics.upcomingDeadlines.map((item) => (
                                    <div key={item._id} className="flex items-center justify-between border-b border-gray-100 py-3 last:border-b-0">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{item.leadCode} - {item.client}</p>
                                            <p className="text-xs text-gray-500">{item.company} | {item.status}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-700">{formatDate(item.targetDate)}</p>
                                            <p className={`text-xs ${item.dueInDays < 0 ? "text-red-600" : item.dueInDays <= 2 ? "text-amber-600" : "text-gray-500"}`}>
                                                {item.dueInDays < 0 ? `${Math.abs(item.dueInDays)}d overdue` : `${item.dueInDays}d left`}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-4 py-3">
                            <h2 className="text-base font-bold text-gray-900">Top Companies</h2>
                            <p className="text-xs text-gray-500">By total lead volume.</p>
                        </div>
                        <div className="max-h-[340px] overflow-auto px-4 py-2">
                            {metrics.topCompanies.length === 0 ? (
                                <p className="py-6 text-sm text-gray-500">No company data yet.</p>
                            ) : (
                                metrics.topCompanies.map((item, index) => (
                                    <div key={item.name} className="flex items-center justify-between border-b border-gray-100 py-3 last:border-b-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                                            <span className="text-sm font-medium text-gray-800">{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="rounded-full bg-[#4c5165] px-2 py-0.5 text-xs font-semibold text-white">
                                                {item.value}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <span>Quick Links:</span>
                    <NavLink to="/leads" className="rounded-full bg-gray-200 px-3 py-1 font-semibold text-gray-700 hover:bg-gray-300">
                        Leads
                    </NavLink>
                    <NavLink to="/in_quote" className="rounded-full bg-gray-200 px-3 py-1 font-semibold text-gray-700 hover:bg-gray-300">
                        In Quotation
                    </NavLink>
                    <NavLink to="/in_survey" className="rounded-full bg-gray-200 px-3 py-1 font-semibold text-gray-700 hover:bg-gray-300">
                        Site Survey
                    </NavLink>
                    <NavLink to="/in_design" className="rounded-full bg-gray-200 px-3 py-1 font-semibold text-gray-700 hover:bg-gray-300">
                        Drawing Phase
                    </NavLink>
                    <NavLink to="/in_review" className="rounded-full bg-gray-200 px-3 py-1 font-semibold text-gray-700 hover:bg-gray-300">
                        Under Review
                    </NavLink>
                </div>
            </section>
        </Layout>
    );
}
