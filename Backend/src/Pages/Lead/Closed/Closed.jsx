import { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import Layout from '../../../Layout';
import Datatable from '../../../Components/Datatable/Datatable';
import View from './View';
import axios from 'axios';
import CachedIcon from '@mui/icons-material/Cached';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import 'react-toastify/dist/ReactToastify.css';
import { formatCurrencyGBP } from '../../../utils/formatters';
import { ensureLeadDetail } from '../../../utils/leadDetails';

export default function Closed() {
    document.title = 'Closed Projects';

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
    const [totalRows, setTotalRows] = useState(0);


    const [selectedCompany, setSelectedCompany] = useState("All");
    const [companies, setCompanies] = useState([]);
    const [tableQuery, setTableQuery] = useState({ page: 1, limit: 10, search: "", sortBy: "", sortDir: "desc" });


    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`, {
                params: {
                    status: "Closed",
                    company: selectedCompany === "All" ? "" : selectedCompany,
                    page: tableQuery.page,
                    limit: tableQuery.limit,
                    search: tableQuery.search,
                    sortBy: tableQuery.sortBy,
                    sortDir: tableQuery.sortDir,
                }
            });
            const payload = response.data;
            const rows = Array.isArray(payload) ? payload : (payload?.rows || []);
            setData(rows);
            setTotalRows(Array.isArray(payload) ? rows.length : Number(payload?.total || 0));
            if (Array.isArray(payload?.companies)) {
                setCompanies(payload.companies);
            } else {
                const uniqueCompanies = [...new Set(rows.map((item) => item.company))].filter(Boolean);
                setCompanies(uniqueCompanies);
            }
        } catch {
            toast.error('Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    }, [EndPoint, selectedCompany, tableQuery.limit, tableQuery.page, tableQuery.search, tableQuery.sortBy, tableQuery.sortDir]);

    const handleServerQueryChange = useCallback((nextQuery) => {
        setTableQuery((prev) => {
            const next = {
                ...prev,
                ...nextQuery,
                page: Math.max(1, Number(nextQuery?.page || prev.page || 1)),
                limit: Math.max(1, Number(nextQuery?.limit || prev.limit || 10)),
            };
            if (
                prev.page === next.page &&
                prev.limit === next.limit &&
                prev.search === next.search &&
                prev.sortBy === next.sortBy &&
                prev.sortDir === next.sortDir
            ) return prev;
            return next;
        });
    }, []);


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


    const handleView = async (row) => {
        try {
            const fullRow = await ensureLeadDetail(row);
            setViewData(fullRow);
        } catch {
            toast.error("Failed to load lead details.");
            return;
        }
        setViewModalOpen(true);
    };

    useEffect(() => { fetchData(); }, [fetchData]);

    const renderClientWithCompany = (row) => {
        const clientName = row.client?.name || "N/A";
        const companyName = row.client?.company?.trim() ? row.client.company : null;
        const displayText = companyName ? `${clientName} (${companyName})` : clientName;

        return (
            <div className="max-w-60 min-w-0">
                <p className="truncate text-slate-700" title={displayText}>{displayText}</p>
                {(row.client?.phone || row.client?.email) && (
                    <p
                        className="truncate text-xs text-slate-500 cursor-copy"
                        title={`Click to copy: ${row.client?.phone && row.client?.email ? `${row.client.phone} (${row.client.email})` : (row.client?.phone || row.client?.email)}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard?.writeText(
                                row.client?.phone && row.client?.email
                                    ? `${row.client.phone} (${row.client.email})`
                                    : (row.client?.phone || row.client?.email || "")
                            );
                        }}
                    >
                        {row.client?.phone && row.client?.email ? `${row.client.phone} (${row.client.email})` : (row.client?.phone || row.client?.email)}
                    </p>
                )}
            </div>
        );
    };

    const renderAddressCell = (row) => {
        const address = row.address?.trim() || "N/A";
        return (
            <p
                className="block text-xs leading-4 text-slate-600"
                title={address}
                style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    wordBreak: "break-word",
                    width: "220px",
                    minWidth: "220px",
                    maxWidth: "220px",
                }}
            >
                {address}
            </p>
        );
    };

    const columns = [
        { key: "close_date", accessorKey: 'close_date', header: 'Date', maxSize: 60 },
        { key: "leadCode", accessorKey: 'leadCode', header: 'Code', maxSize: 60 },
        { key: "client", header: 'Client', minSize: 220, maxSize: 260, Cell: ({ row }) => renderClientWithCompany(row.original) },
        { key: "project_type", accessorKey: 'project_type', header: 'Project Type' },
        { key: "address", header: 'Project Address', size: 220, minSize: 220, maxSize: 220, grow: false, muiTableBodyCellProps: { sx: { whiteSpace: 'normal !important', overflow: 'hidden' } }, Cell: ({ row }) => renderAddressCell(row.original) },
        {
            key: "quote_price",
            header: "Quote",
            accessorFn: row => formatCurrencyGBP(row.quote_price),
            maxSize: 50,
            muiTableHeadCellProps: { align: "center" },
            muiTableBodyCellProps: { align: "center" }
        },
        {
            key: "payment_received_total",
            header: "Received",
            accessorFn: row => formatCurrencyGBP(row.payment_received_total || 0),
            maxSize: 50,
            muiTableHeadCellProps: { align: "center" },
            muiTableBodyCellProps: { align: "center" }
        },
        {
            key: "payment_discount_total",
            header: "Discount",
            accessorFn: row => formatCurrencyGBP(row.payment_discount_total || 0),
            maxSize: 50,
            muiTableHeadCellProps: { align: "center" },
            muiTableBodyCellProps: { align: "center" }
        },
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
                        <div className="crmSetStatusGroup inline-flex w-max items-center whitespace-nowrap">
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

            <section className="leadPageShell">
                <div className="leadPageHeader">
                    <div className='leadPageHeaderLeft'>
                        <h1 className="leadPageTitle">Closed Projects</h1>

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

                        <span className="leadPageCount">
                            Total: {totalRows}
                        </span>
                    </div>

                    <div className='leadPageHeaderActions'>
                        <select
                            className="leadPageFilterSelect"
                            value={selectedCompany}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSelectedCompany(value);
                                setTableQuery((prev) => ({ ...prev, page: 1 }));
                            }}
                        >
                            <option value="All">All Companies</option>
                            {companies.map((company, index) => (
                                <option key={index} value={company}>{company}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="leadPageTableWrap">
                    <Datatable
                        columns={columns}
                        data={data}
                        onEdit={() => { }}
                        onView={handleView}
                        onDelete={handleDelete}
                        permissions={userPermissions}
                        serverMode={true}
                        totalRows={totalRows}
                        isLoading={loading}
                        onServerQueryChange={handleServerQueryChange}
                    />
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
