import { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import Layout from '../../../Layout';
import Datatable from '../../../Components/Datatable/Datatable';
import View from './View';
import axios from 'axios';
import CachedIcon from '@mui/icons-material/Cached';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import 'react-toastify/dist/ReactToastify.css';

export default function Closed() {
    document.title = 'Closed Projects';

    const EndPoint = 'leads';

    const userType = localStorage.getItem("userType");

    const userPermissions = {
        canEdit: false,
        canView: true,
        canDelete: false,
    };


    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [viewData, setViewData] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);


    const [selectedCompany, setSelectedCompany] = useState("All");
    const [companies, setCompanies] = useState([]);


    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`);
            const filteredData = response.data.filter(item => item.status === "Closed");

            const uniqueCompanies = [...new Set(filteredData.map(item => item.company))].filter(Boolean);
            setCompanies(uniqueCompanies);

            const filteredByCompany = selectedCompany === "All"
                ? filteredData
                : filteredData.filter(item => item.company === selectedCompany);

            setData(filteredByCompany.reverse());
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


    const handleEdit = (row) => {
        setEditData(row);
        setModalOpen(true);
    };

    const handleView = (row) => {
        setViewData(row);
        setViewModalOpen(true);
    };

    useEffect(() => { fetchData(); }, [selectedCompany]);



    const columns = [
        { key: "close_date", accessorKey: 'close_date', header: 'Date', maxSize: 80 },
        { key: "leadCode", accessorKey: 'leadCode', header: 'Code', maxSize: 80 },
        { accessorFn: row => row.client?.phone ? `${row.client?.name || "N/A"} (${row.client.phone})` : (row.client?.name || "N/A"), header: 'Client' },
        { key: "project_type", accessorKey: 'project_type', header: 'Project Type' },
        { key: "quote_price", header: "Quote Price", accessorFn: row => `£${row.quote_price || 0}`, maxSize: 50 },
        { key: "final_price", header: "Final Price", accessorFn: row => `£${row.final_price || 0}`, maxSize: 50 },
        ...(userType === "Admin"
            ? [
                {
                    key: "actions",
                    header: "Set Status",
                    maxSize: 50,
                    Cell: ({ row }) => (
                        <div className="flex">
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

            <section className="flex justify-between px-1 md:px-4 py-2 bg-[#4c5165]">
                <div className='flex justify-center items-center'>
                    <h1 className="font-bold text-sm md:text-lg text-white mr-2">Closed Projects</h1>

                    {loading ? (
                        <div className="flex justify-center items-center text-white">
                            <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="3" strokeDasharray="10" strokeDashoffset="75" />
                            </svg>
                        </div>
                    ) : <button className="text-gray-200 cursor-pointer" onClick={fetchData}><CachedIcon /></button>
                    }

                    <span className="ml-2 text-xs text-gray-300">
                        Total: {data.length}
                    </span>
                </div>

                <select
                    className="mr-4 px-3 py-1.5 rounded-md bg-gray-700 text-sm text-white border border-gray-500 focus:outline-none cursor-pointer"
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                >
                    <option value="All">All Companies</option>
                    {companies.map((company, index) => (
                        <option key={index} value={company}>{company}</option>
                    ))}
                </select>
            </section>

            <section>
                {loading ? (
                    <div className="flex justify-center py-4">
                        <svg className="animate-spin p-5 h-32 w-32 text-gray-700" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="3" strokeDasharray="50" strokeDashoffset="80" />
                        </svg>
                    </div>
                ) : (
                    <Datatable
                        columns={columns}
                        data={data}
                        onEdit={handleEdit}
                        onView={handleView}
                        onDelete={handleDelete}
                        permissions={userPermissions}
                    />
                )}
            </section>

            {modalOpen && (
                <Add_Edit
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    data={editData}
                    refreshData={fetchData}
                />
            )}

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