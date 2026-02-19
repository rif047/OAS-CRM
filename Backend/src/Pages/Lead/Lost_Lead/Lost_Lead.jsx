import { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import Layout from '../../../Layout';
import Datatable from '../../../Components/Datatable/Datatable';
import View from './View';
import axios from 'axios';
import CachedIcon from '@mui/icons-material/Cached';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import 'react-toastify/dist/ReactToastify.css';

export default function Lost_Lead() {
    document.title = 'Lost Leads';

    const EndPoint = 'leads';

    const userType = localStorage.getItem("userType");

    const userPermissions = {
        canEdit: false,
        canView: true,
        canDelete: false,
    };


    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewData, setViewData] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);


    const [selectedCompany, setSelectedCompany] = useState("All");
    const [companies, setCompanies] = useState([]);


    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`, {
                params: { status: "Lost_Lead" }
            });
            const filteredData = response.data;

            const uniqueCompanies = [...new Set(filteredData.map(item => item.company))].filter(Boolean);
            setCompanies(uniqueCompanies);

            const filteredByCompany = selectedCompany === "All"
                ? filteredData
                : filteredData.filter(item => item.company === selectedCompany);

            setData(filteredByCompany);
        } catch {
            toast.error('Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };


    const handleDelete = async (row) => {
        if (window.confirm(`Are you sure you want to delete ${row.leadCode.toUpperCase()}?`)) {
            try {
                await axios.delete(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/${row._id}`);
                toast.success(`${row.leadCode.toUpperCase()} deleted.`);
                fetchData();
            } catch (error) {
                toast.error('Failed to delete. Please try again.');
                console.error('Error deleting data:', error);
            }
        }
    };

    const handleToPending = async (row) => {
        if (window.confirm(`Back to Hot Lead for ${row.leadCode}?`)) {
            try {
                await axios.patch(
                    `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/pending/${row._id}`,
                    { status: "Pending" }
                );
                toast.success("Moved back to Lead!");
                fetchData();
            } catch (error) {
                console.error("Error updating status:", error);
                toast.error("Failed to mark as Cancelled.");
            }
        }
    };


    const handleView = (row) => {
        setViewData(row);
        setViewModalOpen(true);
    };

    useEffect(() => { fetchData(); }, [selectedCompany]);



    const columns = [
        { key: "createdAt", accessorFn: (row) => new Date(row.createdAt).toLocaleDateString(), header: 'Created', maxSize: 80 },
        { key: "lost_date", accessorKey: 'lost_date', header: 'Lost', maxSize: 80 },
        { key: "leadCode", accessorKey: 'leadCode', header: 'Code', maxSize: 80 },
        { accessorFn: row => row.client?.phone ? `${row.client?.name || "N/A"} (${row.client.phone})` : (row.client?.name || "N/A"), header: 'Client' },
        { key: "project_type", accessorKey: 'project_type', header: 'Project Type' },
        ...(userType === "Admin"
            ? [
                {
                    id: "setStatus",
                    key: "actions",
                    header: "Set Status",
                    size: 1,
                    minSize: 1,
                    maxSize: 260,
                    grow: false,
                    Cell: ({ row }) => (
                        <div className="inline-flex w-max items-center whitespace-nowrap">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToPending(row.original);
                                }}
                                className="text-orange-500 font-bold flex items-center cursor-pointer"
                            >
                                <span className="text-xs mr-1 text-center">Back to Lead</span>
                                <ArrowOutwardIcon fontSize="small" />
                            </button>
                        </div>
                    ),
                },
            ]
            : []),
    ];

    return (
        <Layout>
            <ToastContainer position="bottom-right" autoClose={2000} />

            <section className="overflow-hidden rounded-xl border border-[#F0F0F0] bg-white shadow-sm">
                <div className="flex flex-col gap-3 bg-[#4c5165] px-4 py-3 md:flex-row md:items-center md:justify-between">
                    <div className='flex items-center gap-2 text-white'>
                        <h1 className="text-lg font-bold">Lost Projects</h1>

                        {loading ? (
                            <div className="flex items-center justify-center text-white">
                                <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="3" strokeDasharray="10" strokeDashoffset="75" />
                                </svg>
                            </div>
                        ) : (
                            <button className="text-gray-200 hover:text-white cursor-pointer" onClick={fetchData} title="Refresh">
                                <CachedIcon />
                            </button>
                        )}

                        <span className="rounded-full bg-[#4c5165] px-2 py-1 text-xs font-semibold text-gray-300 ring-1 ring-gray-400/40">
                            Total: {data.length}
                        </span>
                    </div>

                    <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                        <select
                            className="rounded-md border border-gray-500 bg-gray-700 px-3 py-2 text-sm text-white focus:outline-none cursor-pointer"
                            value={selectedCompany}
                            onChange={(e) => setSelectedCompany(e.target.value)}
                        >
                            <option value="All">All Companies</option>
                            {companies.map((company, index) => (
                                <option key={index} value={company}>{company}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="p-3 md:p-4">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <svg className="h-20 w-20 animate-spin p-4 text-gray-700" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="3" strokeDasharray="50" strokeDashoffset="80" />
                            </svg>
                        </div>
                    ) : (
                        <Datatable
                            columns={columns}
                            data={data}
                            onEdit={() => { }}
                            onView={handleView}
                            onDelete={handleDelete}
                            permissions={userPermissions}
                        />
                    )}
                </div>
            </section>

            {viewModalOpen && (
                <View
                    open={viewModalOpen}
                    onClose={() => setViewModalOpen(false)}
                    viewData={viewData}
                />
            )}
        </Layout>
    );
}
