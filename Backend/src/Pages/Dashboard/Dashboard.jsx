// import { useEffect, useState } from "react";
// import axios from "axios";
// import Layout from "../../Layout";
// import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, } from "recharts";
// import CachedIcon from "@mui/icons-material/Cached";

// const formatCurrency = (val) =>
//     new Intl.NumberFormat("en-GB", {
//         style: "currency",
//         currency: "GBP",
//         minimumFractionDigits: 0,
//         maximumFractionDigits: 0,
//     }).format(val);

// export default function Dashboard() {
//     document.title = "Dashboard";
//     const [loading, setLoading] = useState(true);
//     const [stats, setStats] = useState({
//         pendingPayments: 0,
//         pendingLeads: 0,
//         totalClients: 0,
//         monthClients: 0,
//         totalEmployees: 0,
//         monthEmployees: 0,
//         totalClosed: 0,
//         monthClosed: 0,
//         totalLost: 0,
//         monthLost: 0,
//     });
//     const [charts, setCharts] = useState({
//         closedDaily: [],
//         lostDaily: [],
//         incomeMonthly: [],
//         leadMonthly: [],
//         sixMonth: [],
//     });

//     const monthLabel = new Date().toLocaleString("default", {
//         month: "short",
//         year: "numeric",
//     });
//     const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

//     const loadDashboard = async () => {
//         setLoading(true);
//         try {
//             const [leadsRes, clientsRes, employeesRes] = await Promise.all([
//                 axios.get(`${import.meta.env.VITE_SERVER_URL}/api/leads`),
//                 axios.get(`${import.meta.env.VITE_SERVER_URL}/api/clients`),
//                 axios.get(`${import.meta.env.VITE_SERVER_URL}/api/employees`),
//             ]);

//             const leads = leadsRes.data || [];
//             const clients = clientsRes.data || [];
//             const employees = employeesRes.data || [];

//             let pendingPayments = 0,
//                 pendingLeads = 0,
//                 totalClosed = 0,
//                 totalLost = 0,
//                 monthClosed = 0,
//                 monthLost = 0;

//             const closedDaily = {},
//                 lostDaily = {},
//                 closedMonthly = {},
//                 lostMonthly = {},
//                 incomeMonthly = {},
//                 leadMonthly = {};

//             leads.forEach((lead) => {
//                 const created = new Date(lead.createdAt);
//                 const date = lead.date ? new Date(lead.date) : created;
//                 const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
//                 const createdKey = `${created.getFullYear()}-${created.getMonth() + 1}`;
//                 const dateStr = date.toISOString().split("T")[0];

//                 if (lead.status === "PendingPayment") pendingPayments++;
//                 if (lead.status === "Pending") pendingLeads++;

//                 if (lead.status === "Closed") {
//                     totalClosed++;
//                     if (date >= startOfMonth) monthClosed++;
//                     closedDaily[dateStr] = (closedDaily[dateStr] || 0) + 1;
//                     closedMonthly[key] = (closedMonthly[key] || 0) + 1;
//                     incomeMonthly[key] = (incomeMonthly[key] || 0) + (Number(lead.fee) || 0);
//                 }

//                 if (lead.status === "LeadLost") {
//                     totalLost++;
//                     if (date >= startOfMonth) monthLost++;
//                     lostDaily[dateStr] = (lostDaily[dateStr] || 0) + 1;
//                     lostMonthly[key] = (lostMonthly[key] || 0) + 1;
//                 }

//                 leadMonthly[createdKey] = (leadMonthly[createdKey] || 0) + 1;
//             });

//             const now = new Date();
//             const months = [];
//             for (let i = 5; i >= 0; i--) {
//                 const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
//                 const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
//                 months.push({
//                     month: d.toLocaleString("default", { month: "short" }),
//                     closed: closedMonthly[key] || 0,
//                     lost: lostMonthly[key] || 0,
//                     income: incomeMonthly[key] || 0,
//                     leads: leadMonthly[key] || 0,
//                 });
//             }

//             setStats({
//                 pendingPayments,
//                 pendingLeads,
//                 totalClients: clients.length,
//                 monthClients: clients.filter((o) => new Date(o.createdAt) >= startOfMonth).length,
//                 totalEmployees: employees.length,
//                 monthEmployees: employees.filter((e) => new Date(e.createdAt) >= startOfMonth).length,
//                 totalClosed,
//                 monthClosed,
//                 totalLost,
//                 monthLost,
//             });

//             const currentYear = new Date().getFullYear();
//             const currentMonth = new Date().getMonth();
//             const filterCurrentMonth = (obj) =>
//                 Object.entries(obj)
//                     .filter(([date]) => {
//                         const d = new Date(date);
//                         return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
//                     })
//                     .map(([date, count]) => ({ date, count }));

//             setCharts({
//                 closedDaily: filterCurrentMonth(closedDaily),
//                 lostDaily: filterCurrentMonth(lostDaily),
//                 incomeMonthly: months.map((m) => ({ month: m.month, income: m.income })),
//                 leadMonthly: months.map((m) => ({ month: m.month, leads: m.leads })),
//                 sixMonth: months.map((m) => ({ month: m.month, closed: m.closed, lost: m.lost })),
//             });
//         } catch (err) {
//             console.error(err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         loadDashboard();
//     }, []);

//     const StatCard = ({ icon, title, value, sub }) => (
//         <div className="bg-white hover:bg-gray-50 transition-all p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md">
//             <div className="text-3xl mb-1">{icon}</div>
//             <p className="text-gray-500 text-sm">{title}</p>
//             <p className="text-3xl font-bold text-gray-800">{value}</p>
//             {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
//         </div>
//     );

//     const SimpleBar = ({ title, color, data, dataKey, format }) => (
//         <div className="bg-white p-5 rounded-xl shadow border border-gray-400 hover:shadow-md transition">
//             <h2 className="text-lg font-semibold mb-3 text-gray-800">{title}</h2>
//             <ResponsiveContainer width="100%" height={250}>
//                 <BarChart data={data}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
//                     <XAxis dataKey="month" tick={{ fontSize: 12 }} />
//                     <YAxis tick={{ fontSize: 12 }} />
//                     <Tooltip formatter={(val) => (format === "currency" ? formatCurrency(val) : val)} />
//                     <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
//                 </BarChart>
//             </ResponsiveContainer>
//         </div>
//     );

//     const PieBox = () => {
//         const colors = ["#0fb07a", "#f87171"];
//         const monthRate =
//             stats.monthClosed + stats.monthLost > 0
//                 ? ((stats.monthClosed / (stats.monthClosed + stats.monthLost)) * 100).toFixed(1)
//                 : 0;
//         const totalRate =
//             stats.totalClosed + stats.totalLost > 0
//                 ? ((stats.totalClosed / (stats.totalClosed + stats.totalLost)) * 100).toFixed(1)
//                 : 0;

//         const dataSets = [
//             {
//                 label: "Current Month",
//                 data: [
//                     { name: "Closed", value: stats.monthClosed },
//                     { name: "Lost", value: stats.monthLost },
//                 ],
//                 rate: monthRate,
//             },
//             {
//                 label: "Overall",
//                 data: [
//                     { name: "Closed", value: stats.totalClosed },
//                     { name: "Lost", value: stats.totalLost },
//                 ],
//                 rate: totalRate,
//             },
//         ];

//         return (
//             <div className="bg-white p-5 rounded-xl shadow border border-gray-400 hover:shadow-md transition">
//                 <h2 className="text-lg font-semibold text-gray-800 mb-2">Closed vs Lost Leads</h2>
//                 <p className="text-sm text-gray-500 mb-4">Monthly & All-time comparison</p>
//                 <div className="flex flex-col sm:flex-row justify-around items-center gap-4">
//                     {dataSets.map((v, i) => (
//                         <div key={i} className="flex flex-col items-center w-full sm:w-1/2">
//                             <ResponsiveContainer width="100%" height={220}>
//                                 <PieChart>
//                                     <Pie data={v.data} dataKey="value" cx="50%" cy="50%" outerRadius={70} label>
//                                         {v.data.map((_, i2) => (
//                                             <Cell key={i2} fill={colors[i2]} />
//                                         ))}
//                                     </Pie>
//                                     <Tooltip />
//                                 </PieChart>
//                             </ResponsiveContainer>
//                             <p className="text-sm text-gray-600 mt-2">
//                                 {v.label} Success Rate:{" "}
//                                 <span className="font-semibold text-gray-600">{v.rate}%</span>
//                             </p>
//                         </div>
//                     ))}
//                 </div>
//             </div>
//         );
//     };

//     const SixMonthBox = () => (
//         <div className="bg-white p-5 rounded-xl shadow border border-gray-400 hover:shadow-md transition">
//             <h2 className="text-lg font-semibold text-gray-800">Closed vs Lost Leads</h2>
//             <p className="text-sm text-gray-500 mb-4">Last 6 Months</p>
//             <ResponsiveContainer width="100%" height={250}>
//                 <BarChart data={charts.sixMonth}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
//                     <XAxis dataKey="month" tick={{ fontSize: 12 }} />
//                     <YAxis tick={{ fontSize: 12 }} />
//                     <Tooltip />
//                     <Legend />
//                     <Bar dataKey="closed" fill="#0fb07a" radius={[6, 6, 0, 0]} />
//                     <Bar dataKey="lost" fill="#f87171" radius={[6, 6, 0, 0]} />
//                 </BarChart>
//             </ResponsiveContainer>
//         </div>
//     );

//     if (loading)
//         return (
//             <Layout>
//                 <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
//                     <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
//                     <p>Loading Dashboard...</p>
//                 </div>
//             </Layout>
//         );

//     return (
//         <Layout>
//             <section className="p-2 space-y-8 min-h-screen">
//                 <div className="flex justify-between items-center flex-wrap gap-3 mb-6">
//                     <h1 className="text-2xl font-bold text-gray-800">📊 Dashboard Overview</h1>
//                     <button
//                         onClick={loadDashboard}
//                         disabled={loading}
//                         className="flex items-center gap-2 border-2 text-gray-700 border-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 cursor-pointer"
//                     >
//                         <CachedIcon className={loading ? "animate-spin" : ""} />
//                         {loading ? "Refreshing..." : "Reload"}
//                     </button>
//                 </div>

//                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 [&>*]:border [&>*]:border-gray-400">
//                     <StatCard icon="⏳" title="Hot Leads (Backlog)" value={stats.pendingLeads} />
//                     <StatCard icon="💷" title="Pending Payments" value={stats.pendingPayments} />
//                     <StatCard
//                         icon="👤"
//                         title={`Clients (${monthLabel})`}
//                         value={stats.monthClients}
//                         sub={`${stats.totalClients} total`}
//                     />
//                     <StatCard
//                         icon="👔"
//                         title={`Employees (${monthLabel})`}
//                         value={stats.monthEmployees}
//                         sub={`${stats.totalEmployees} total`}
//                     />
//                 </div>

//                 <div className="bg-white p-5 rounded-xl shadow border hover:shadow-md transition border-gray-400">
//                     <h2 className="text-lg font-semibold mb-3 text-gray-800">
//                         Closed vs Lost Leads ({monthLabel})
//                     </h2>
//                     <ResponsiveContainer width="100%" height={300}>
//                         <BarChart
//                             barCategoryGap="20%"
//                             data={(() => {
//                                 const map = {};
//                                 charts.closedDaily.forEach((i) => {
//                                     map[i.date] = { date: i.date, closed: i.count, lost: 0 };
//                                 });
//                                 charts.lostDaily.forEach((i) => {
//                                     if (!map[i.date]) map[i.date] = { date: i.date, closed: 0, lost: 0 };
//                                     map[i.date].lost = i.count;
//                                 });

//                                 const year = new Date().getFullYear();
//                                 const month = new Date().getMonth();
//                                 const days = new Date(year, month + 1, 0).getDate();
//                                 const data = [];

//                                 for (let d = 1; d <= days; d++) {
//                                     const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(
//                                         2,
//                                         "0"
//                                     )}`;
//                                     const item = map[date] || { date, closed: 0, lost: 0 };
//                                     const total = item.closed + item.lost;
//                                     const rate = total ? ((item.closed / total) * 100).toFixed(1) : 0;
//                                     data.push({ ...item, rate });
//                                 }

//                                 return data;
//                             })()}
//                         >
//                             <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
//                             <XAxis
//                                 dataKey="date"
//                                 tickFormatter={(v) => new Date(v).getDate()}
//                                 tick={{ fontSize: 10 }}
//                                 height={40}
//                             />
//                             <YAxis tick={{ fontSize: 11 }} />
//                             <Tooltip
//                                 formatter={(value, name, props) => {
//                                     const key = props?.dataKey;
//                                     const label =
//                                         key === "closed" ? "Closed" :
//                                             key === "lost" ? "Lost" :
//                                                 key === "rate" ? "Success Rate" :
//                                                     key;
//                                     return key === "rate" ? [`${value}%`, label] : [value, label];
//                                 }}
//                                 labelFormatter={(label) =>
//                                     new Date(label).toLocaleDateString("en-GB", {
//                                         day: "numeric",
//                                         month: "short",
//                                     })
//                                 }
//                                 cursor={{ fill: "rgba(0,0,0,0.05)" }}
//                             />

//                             <Legend />
//                             <Bar dataKey="closed" name="Closed" fill="#0fb07a" radius={[6, 6, 0, 0]} />
//                             <Bar dataKey="lost" name="Lost" fill="#f87171" radius={[6, 6, 0, 0]} />
//                         </BarChart>
//                     </ResponsiveContainer>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <PieBox />
//                     <SixMonthBox />
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <SimpleBar
//                         title="💵 Income (Last 6 Months)"
//                         color="#64748b"
//                         data={charts.incomeMonthly}
//                         dataKey="income"
//                         format="currency"
//                     />
//                     <SimpleBar
//                         title="🗓️ Collected Leads (Last 6 Months)"
//                         color="#0ea5e9"
//                         data={charts.leadMonthly}
//                         dataKey="leads"
//                     />
//                 </div>
//             </section>
//         </Layout>
//     );
// }



import Layout from "../../Layout";

export default function Dashboard() {
    return (
        <Layout>
            <div>Exciting Dashboard Coming Soon..</div>

        </Layout>
    )
}
