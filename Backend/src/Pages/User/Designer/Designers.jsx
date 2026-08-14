import { useState, useEffect, useCallback } from 'react';
import Layout from '../../../Layout';
import Datatable from '../../../Components/Datatable/Datatable';
import View from './View';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CachedIcon from '@mui/icons-material/Cached';

export default function Designers() {
    document.title = 'Designers';

    const EndPoint = 'users';

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);
    const [tableQuery, setTableQuery] = useState({ page: 1, limit: 10, search: '', sortBy: '', sortDir: 'desc' });
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewData, setViewData] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`, {
                params: {
                    userType: 'Designer',
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
        } catch (error) {
            toast.error('Failed to fetch data. Please try again.');
            console.error('Error fetching designers:', error);
        } finally {
            setLoading(false);
        }
    }, [EndPoint, tableQuery.limit, tableQuery.page, tableQuery.search, tableQuery.sortBy, tableQuery.sortDir]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    const handleView = (row) => {
        setViewData(row);
        setViewModalOpen(true);
    };

    const columns = [
        { id: 'name', accessorKey: 'name', header: 'Designer Name' },
        { id: 'phone', accessorKey: 'phone', header: 'Phone', enableClickToCopy: true },
        { id: 'designation', accessorKey: 'designation', header: 'Designation' },
    ];

    columns.forEach(column => {
        column.Cell = ({ cell }) => {
            const value = cell.getValue();
            if (!value) return '';
            const text = String(value);
            return (
                <span title={text}>
                    {text.slice(0, 40)}{text.length > 40 && '...'}
                </span>
            );
        };
    });

    const userPermissions = {
        canEdit: false,
        canView: true,
        canDelete: false,
    };

    return (
        <Layout>
            <ToastContainer position="bottom-right" autoClose={2000} />
            <section className="overflow-hidden rounded-xl border border-[#F0F0F0] bg-white shadow-sm">
                <div className="flex flex-col gap-3 bg-[#4c5165] px-4 py-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <h1 className="text-lg font-bold">Designer List</h1>

                        {loading ? (
                            <div className="flex items-center justify-center text-white">
                                <svg
                                    className="h-5 w-5 animate-spin text-white"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="8"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeDasharray="10"
                                        strokeDashoffset="75"
                                    />
                                </svg>
                            </div>
                        ) : (
                            <button className="text-gray-200 hover:text-white cursor-pointer" onClick={fetchData} title="Refresh">
                                <CachedIcon />
                            </button>
                        )}

                        <span className="rounded-full bg-[#4c5165] px-2 py-1 text-xs font-semibold text-gray-300 ring-1 ring-gray-400/40">
                            Total: {totalRows}
                        </span>
                    </div>
                </div>

                <div className="p-3 md:p-4">
                    <Datatable
                        columns={columns}
                        data={data}
                        onView={handleView}
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
