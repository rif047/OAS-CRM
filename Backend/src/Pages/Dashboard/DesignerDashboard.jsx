import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Layout from "../../Layout";
import CachedIcon from "@mui/icons-material/Cached";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import DrawIcon from "@mui/icons-material/Draw";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Cell,
} from "recharts";
import { formatLondonDateShort, formatLondonDateTime } from "../../utils/formatters";

const STATUS_META = {
    Pending: { label: "Leads", color: "#64748b" },
    In_Quote: { label: "In Quotation", color: "#0ea5e9" },
    In_Survey: { label: "Site Survey", color: "#06b6d4" },
    In_Design: { label: "Drawing Phase", color: "#a855f7" },
    In_Review: { label: "Under Review", color: "#f59e0b" },
    Closed: { label: "Closed", color: "#22c55e" },
    Lost_Lead: { label: "Lost Lead", color: "#ef4444" },
};

const parseDate = (value) => {
    if (!value) return null;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function DesignerDashboard() {
    document.title = "Designer Dashboard";

    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    }, []);

    const userType = localStorage.getItem("userType");
    const canAccess = userType === "Designer" || userType === "Admin" || userType === "Management";

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);
    const [data, setData] = useState({
        summary: {
            totalAssigned: 0,
            inDesignNow: 0,
            dueToday: 0,
            overdue: 0,
            scheduledThisMonth: 0,
            completedThisMonth: 0,
        },
        statusBreakdown: [],
        upcomingDeadlines: [],
        recentUpdates: [],
        dateContext: { today: "", month: "" },
        designer: null,
    });

    const loadDashboard = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/leads/dashboard/designer`);
            setData({
                summary: res.data?.summary || {},
                statusBreakdown: Array.isArray(res.data?.statusBreakdown) ? res.data.statusBreakdown : [],
                upcomingDeadlines: Array.isArray(res.data?.upcomingDeadlines) ? res.data.upcomingDeadlines : [],
                recentUpdates: Array.isArray(res.data?.recentUpdates) ? res.data.recentUpdates : [],
                dateContext: res.data?.dateContext || { today: "", month: "" },
                designer: res.data?.designer || null,
            });
            setLastUpdated(new Date());
        } catch {
            setError("Unable to load designer dashboard data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (canAccess) loadDashboard();
    }, [canAccess]);

    const statusChart = useMemo(() => {
        return (data.statusBreakdown || []).map((item) => ({
            name: STATUS_META[item.status]?.label || item.status,
            value: Number(item.count || 0),
            fill: STATUS_META[item.status]?.color || "#64748b",
        }));
    }, [data.statusBreakdown]);

    if (!canAccess) {
        return (
            <Layout>
                <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-red-800">
                    Designer dashboard access is restricted.
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
                            <h1 className="text-xl font-bold text-white">Designer Dashboard</h1>
                            <p className="text-sm text-gray-200">
                                {data.designer || user?.name || "Designer"} - assigned drawings, deadlines and progress.
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-700">
                            <AssignmentTurnedInIcon fontSize="small" />
                            <p className="text-sm font-semibold">Total Assigned</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{data.summary.totalAssigned || 0}</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-700">
                            <DrawIcon fontSize="small" />
                            <p className="text-sm font-semibold">In Drawing Now</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{data.summary.inDesignNow || 0}</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-700">
                            <EventAvailableIcon fontSize="small" />
                            <p className="text-sm font-semibold">Due Today</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{data.summary.dueToday || 0}</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-700">
                            <ErrorOutlineIcon fontSize="small" />
                            <p className="text-sm font-semibold">Overdue</p>
                        </div>
                        <p className="text-3xl font-bold text-red-600">{data.summary.overdue || 0}</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-gray-700">
                            <AccessTimeIcon fontSize="small" />
                            <p className="text-sm font-semibold">Completed This Month</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{data.summary.completedThisMonth || 0}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-3">
                            <h2 className="text-base font-bold text-gray-900">Status Distribution</h2>
                            <p className="text-xs text-gray-500">Assigned projects by current status.</p>
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statusChart} layout="vertical" margin={{ left: 24 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                                    <YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                        {statusChart.map((item) => (
                                            <Cell key={item.name} fill={item.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-4 py-3">
                            <h2 className="text-base font-bold text-gray-900">Upcoming Design Deadlines</h2>
                            <p className="text-xs text-gray-500">Nearest assigned drawing deadlines.</p>
                        </div>
                        <div className="max-h-[352px] overflow-auto px-4 py-2">
                            {(data.upcomingDeadlines || []).length === 0 ? (
                                <p className="py-6 text-sm text-gray-500">No upcoming design deadline.</p>
                            ) : (
                                data.upcomingDeadlines.map((item) => (
                                    <div key={item._id} className="flex items-center justify-between border-b border-gray-100 py-3 last:border-b-0">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{item.leadCode || "N/A"}</p>
                                            <p className="text-xs text-gray-500">{item.client?.name || "N/A"} | {item.company || "N/A"}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-700">{formatLondonDateShort(parseDate(item.design_deadline))}</p>
                                            <p className={`text-xs ${item.dueInDays < 0 ? "text-red-600" : item.dueInDays <= 2 ? "text-amber-600" : "text-gray-500"}`}>
                                                {item.dueInDays < 0 ? `${Math.abs(item.dueInDays)}d overdue` : `${item.dueInDays}d left`}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
