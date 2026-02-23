import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { NavLink } from "react-router-dom";
import Layout from "../../Layout";
import CachedIcon from "@mui/icons-material/Cached";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import CurrencyPoundIcon from "@mui/icons-material/CurrencyPound";
import Groups2Icon from "@mui/icons-material/Groups2";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ComposedChart,
    Line,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import { formatCurrencyGBP, formatLondonDateShort, formatLondonDateTime, LONDON_TIME_ZONE } from "../../utils/formatters";

const STATUS_META = {
    Pending: { label: "Leads", color: "#64748b" },
    In_Quote: { label: "In Quotation", color: "#0ea5e9" },
    In_Survey: { label: "Site Survey", color: "#06b6d4" },
    In_Design: { label: "Drawing Phase", color: "#a855f7" },
    In_Review: { label: "Under Review", color: "#f59e0b" },
    Closed: { label: "Closed", color: "#22c55e" },
    Lost_Lead: { label: "Lost Lead", color: "#ef4444" },
};

const PIPELINE_STATUSES = ["Pending", "In_Quote", "In_Survey", "In_Design", "In_Review"];

const parseDate = (value) => {
    if (!value) return null;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseAmount = (value) => {
    if (value === null || value === undefined) return 0;
    const cleaned = String(value).replace(/[^0-9.-]/g, "");
    const amount = Number(cleaned);
    return Number.isFinite(amount) ? amount : 0;
};

const getLondonDateParts = (value = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: LONDON_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(value);

    const mapped = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
        year: Number(mapped.year),
        month: Number(mapped.month),
        day: Number(mapped.day),
    };
};

const getLondonToday = () => {
    const { year, month, day } = getLondonDateParts();
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
};

const formatDate = (value) => {
    const parsed = parseDate(value);
    if (!parsed) return "N/A";
    return formatLondonDateShort(parsed);
};

const daysLeft = (value) => {
    const parsed = parseDate(value);
    if (!parsed) return null;
    const today = getLondonToday();
    today.setUTCHours(0, 0, 0, 0);
    const target = new Date(parsed);
    target.setUTCHours(0, 0, 0, 0);
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

const monthKey = (date) => `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;

export default function Dashboard() {
    document.title = "Dashboard";

    const userType = localStorage.getItem("userType");
    const canAccess = userType === "Admin" || userType === "Management";

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [dashboardData, setDashboardData] = useState({ leads: [], clients: [], users: [] });
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadDashboard = async () => {
        setLoading(true);
        setError("");
        try {
            const [leadRes, clientRes, userRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_SERVER_URL}/api/leads`),
                axios.get(`${import.meta.env.VITE_SERVER_URL}/api/clients`),
                axios.get(`${import.meta.env.VITE_SERVER_URL}/api/users`),
            ]);

            setDashboardData({
                leads: Array.isArray(leadRes.data) ? leadRes.data : [],
                clients: Array.isArray(clientRes.data) ? clientRes.data : [],
                users: Array.isArray(userRes.data) ? userRes.data : [],
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
            loadDashboard();
        }
    }, [canAccess]);

    const metrics = useMemo(() => {
        const { leads, clients, users } = dashboardData;
        const londonToday = getLondonToday();
        const startOfMonth = new Date(Date.UTC(londonToday.getUTCFullYear(), londonToday.getUTCMonth(), 1, 0, 0, 0, 0));

        const statusCounts = Object.keys(STATUS_META).reduce((acc, key) => {
            acc[key] = 0;
            return acc;
        }, {});

        const companyCounter = {};
        const monthlyCounter = {};
        const cycleDurations = [];

        const months = [];
        for (let i = 5; i >= 0; i -= 1) {
            const d = new Date(Date.UTC(londonToday.getUTCFullYear(), londonToday.getUTCMonth() - i, 1, 12, 0, 0, 0));
            months.push({
                key: monthKey(d),
                label: new Intl.DateTimeFormat("en-GB", { timeZone: LONDON_TIME_ZONE, month: "short" }).format(d),
                leads: 0,
                closed: 0,
                lost: 0,
                revenue: 0,
            });
        }
        const monthMap = Object.fromEntries(months.map((m) => [m.key, m]));

        leads.forEach((lead) => {
            const status = lead.status;
            if (statusCounts[status] !== undefined) {
                statusCounts[status] += 1;
            }

            const company = lead.company?.trim?.();
            if (company) companyCounter[company] = (companyCounter[company] || 0) + 1;

            const createdAt = parseDate(lead.createdAt);
            if (createdAt) {
                const mk = monthKey(createdAt);
                if (monthMap[mk]) monthMap[mk].leads += 1;
                if (createdAt >= startOfMonth) {
                    monthlyCounter.newLeads = (monthlyCounter.newLeads || 0) + 1;
                }
            }

            if (status === "Closed") {
                const closeAt = parseDate(lead.close_date) || parseDate(lead.updatedAt);
                if (closeAt) {
                    const mk = monthKey(closeAt);
                    if (monthMap[mk]) {
                        monthMap[mk].closed += 1;
                        monthMap[mk].revenue += parseAmount(lead.final_price);
                    }
                    if (closeAt >= startOfMonth) {
                        monthlyCounter.closedThisMonth = (monthlyCounter.closedThisMonth || 0) + 1;
                    }
                }

                if (createdAt && closeAt) {
                    const days = Math.ceil((closeAt - createdAt) / (1000 * 60 * 60 * 24));
                    if (days >= 0) cycleDurations.push(days);
                }
            }

            if (status === "Lost_Lead") {
                const lostAt = parseDate(lead.lost_date) || parseDate(lead.updatedAt);
                if (lostAt) {
                    const mk = monthKey(lostAt);
                    if (monthMap[mk]) monthMap[mk].lost += 1;
                    if (lostAt >= startOfMonth) {
                        monthlyCounter.lostThisMonth = (monthlyCounter.lostThisMonth || 0) + 1;
                    }
                }
            }
        });

        const activePipeline = PIPELINE_STATUSES.reduce((sum, key) => sum + (statusCounts[key] || 0), 0);
        const closedCount = statusCounts.Closed || 0;
        const lostCount = statusCounts.Lost_Lead || 0;
        const decidedCount = closedCount + lostCount;
        const conversionRate = decidedCount > 0 ? ((closedCount / decidedCount) * 100).toFixed(1) : "0.0";
        const avgCycle = cycleDurations.length
            ? Math.round(cycleDurations.reduce((sum, day) => sum + day, 0) / cycleDurations.length)
            : 0;

        const quotedPipelineValue = leads
            .filter((lead) => ["In_Quote", "In_Survey", "In_Design", "In_Review"].includes(lead.status))
            .reduce((sum, lead) => sum + parseAmount(lead.quote_price), 0);

        const closedRevenue = leads
            .filter((lead) => lead.status === "Closed")
            .reduce((sum, lead) => sum + parseAmount(lead.final_price), 0);

        const usersByType = users.reduce((acc, user) => {
            const key = user.userType || "Other";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const recentLeads = [...leads]
            .sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt))
            .slice(0, 8);

        const pendingItems = leads
            .filter((lead) => lead.status === "In_Survey" || lead.status === "In_Design")
            .map((lead) => {
                const targetDate = lead.status === "In_Survey" ? lead.survey_date : lead.design_deadline;
                return {
                    _id: lead._id,
                    leadCode: lead.leadCode,
                    client: lead.client?.name || "N/A",
                    company: lead.company || "N/A",
                    status: STATUS_META[lead.status]?.label || lead.status,
                    targetDate,
                    dueInDays: daysLeft(targetDate),
                };
            })
            .filter((item) => item.targetDate && item.dueInDays !== null)
            .sort((a, b) => parseDate(a.targetDate) - parseDate(b.targetDate))
            .slice(0, 7);

        return {
            statusCounts,
            activePipeline,
            conversionRate,
            avgCycle,
            quotedPipelineValue,
            closedRevenue,
            newLeadsThisMonth: monthlyCounter.newLeads || 0,
            closedThisMonth: monthlyCounter.closedThisMonth || 0,
            lostThisMonth: monthlyCounter.lostThisMonth || 0,
            totalClients: clients.length,
            newClientsThisMonth: clients.filter((client) => parseDate(client.createdAt) >= startOfMonth).length,
            totalUsers: users.length,
            usersByType,
            topCompanies: Object.entries(companyCounter)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([name, value]) => ({ name, value })),
            monthTrend: months,
            pipelineChart: Object.entries(STATUS_META).map(([key, meta]) => ({
                name: meta.label,
                value: statusCounts[key] || 0,
                fill: meta.color,
            })),
            teamChart: [
                { name: "Admin", value: usersByType.Admin || 0, fill: "#334155" },
                { name: "Management", value: usersByType.Management || 0, fill: "#475569" },
                { name: "Surveyor", value: usersByType.Surveyor || 0, fill: "#06b6d4" },
                { name: "Designer", value: usersByType.Designer || 0, fill: "#a855f7" },
            ].filter((item) => item.value > 0),
            recentLeads,
            pendingItems,
        };
    }, [dashboardData]);

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
                            <h1 className="text-xl font-bold text-white">Business Dashboard</h1>
                            <p className="text-sm text-gray-200">
                                KPCL lead pipeline, revenue, team distribution and upcoming workload.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {lastUpdated && (
                                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-gray-100">
                                    Updated: {formatLondonDateTime(lastUpdated)}
                                </span>
                            )}
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-700">
                            <PendingActionsIcon fontSize="small" />
                            <p className="text-sm font-semibold">Active Pipeline</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{metrics.activePipeline}</p>
                        <p className="text-xs text-gray-500">Across Leads to Under Review</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-700">
                            <AssignmentTurnedInIcon fontSize="small" />
                            <p className="text-sm font-semibold">Win Rate</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{metrics.conversionRate}%</p>
                        <p className="text-xs text-gray-500">
                            Closed {metrics.statusCounts.Closed || 0} vs Lost {metrics.statusCounts.Lost_Lead || 0}
                        </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-700">
                            <CurrencyPoundIcon fontSize="small" />
                            <p className="text-sm font-semibold">Closed Revenue</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrencyGBP(metrics.closedRevenue)}</p>
                        <p className="text-xs text-gray-500">Quoted pipeline: {formatCurrencyGBP(metrics.quotedPipelineValue)}</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-700">
                            <Groups2Icon fontSize="small" />
                            <p className="text-sm font-semibold">Clients</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{metrics.totalClients}</p>
                        <p className="text-xs text-gray-500">+{metrics.newClientsThisMonth} this month</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-700">
                            <TrendingUpIcon fontSize="small" />
                            <p className="text-sm font-semibold">Avg. Close Cycle</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{metrics.avgCycle}d</p>
                        <p className="text-xs text-gray-500">
                            New leads: {metrics.newLeadsThisMonth} this month
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm xl:col-span-2">
                        <div className="mb-2">
                            <h2 className="text-base font-bold text-gray-900">Monthly Lead Performance</h2>
                            <p className="text-xs text-gray-500">Last 6 months: leads created, closed, lost and closed revenue.</p>
                        </div>
                        <div className="h-[290px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={metrics.monthTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        formatter={(value, key) => {
                                            if (key === "revenue") return formatCurrencyGBP(value);
                                            return value;
                                        }}
                                    />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="leads" name="New Leads" fill="#64748b" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="left" dataKey="closed" name="Closed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="left" dataKey="lost" name="Lost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#0ea5e9" strokeWidth={2} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2">
                            <h2 className="text-base font-bold text-gray-900">Team Mix</h2>
                            <p className="text-xs text-gray-500">Total users: {metrics.totalUsers}</p>
                        </div>
                        <div className="h-[290px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={metrics.teamChart}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="48%"
                                        outerRadius={78}
                                        innerRadius={48}
                                    >
                                        {metrics.teamChart.map((entry) => (
                                            <Cell key={entry.name} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm xl:col-span-2">
                        <div className="mb-3">
                            <h2 className="text-base font-bold text-gray-900">Pipeline Distribution</h2>
                            <p className="text-xs text-gray-500">Current volume by status.</p>
                        </div>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.pipelineChart} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={110}
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(value) => value.replace(" ", "\u00A0")}
                                    />
                                    <Tooltip />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                        {metrics.pipelineChart.map((item) => (
                                            <Cell key={item.name} fill={item.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <h2 className="mb-2 text-base font-bold text-gray-900">Top Companies</h2>
                        <p className="mb-3 text-xs text-gray-500">By total lead volume.</p>
                        <div className="space-y-2">
                            {metrics.topCompanies.length === 0 && (
                                <p className="text-sm text-gray-500">No company data yet.</p>
                            )}
                            {metrics.topCompanies.map((item, index) => (
                                <div key={item.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                                        <span className="text-sm font-medium text-gray-800">{item.name}</span>
                                    </div>
                                    <span className="rounded-full bg-[#4c5165] px-2 py-0.5 text-xs font-semibold text-white">
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-4 py-3">
                            <h2 className="text-base font-bold text-gray-900">Upcoming Deadlines</h2>
                            <p className="text-xs text-gray-500">Survey and drawing phase schedule.</p>
                        </div>
                        <div className="max-h-[340px] overflow-auto px-4 py-2">
                            {metrics.pendingItems.length === 0 ? (
                                <p className="py-6 text-sm text-gray-500">No scheduled deadlines available.</p>
                            ) : (
                                metrics.pendingItems.map((item) => (
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
                            <h2 className="text-base font-bold text-gray-900">Recent Leads</h2>
                            <p className="text-xs text-gray-500">Latest created lead entries.</p>
                        </div>
                        <div className="max-h-[340px] overflow-auto px-4 py-2">
                            {metrics.recentLeads.length === 0 ? (
                                <p className="py-6 text-sm text-gray-500">No lead records yet.</p>
                            ) : (
                                metrics.recentLeads.map((lead) => (
                                    <div key={lead._id} className="flex items-center justify-between border-b border-gray-100 py-3 last:border-b-0">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{lead.leadCode || "N/A"}</p>
                                            <p className="text-xs text-gray-500">{lead.client?.name || "Unknown Client"} | {lead.company || "N/A"}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                                                {STATUS_META[lead.status]?.label || lead.status || "N/A"}
                                            </span>
                                            <p className="mt-1 text-xs text-gray-500">{formatDate(lead.createdAt)}</p>
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
