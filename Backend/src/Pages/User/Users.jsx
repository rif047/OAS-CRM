import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import Layout from '../../Layout';
import Datatable from '../../Components/Datatable/Datatable';
import Add_Edit from './Add_Edit';
import View from './View';
import axios from 'axios';
import CachedIcon from '@mui/icons-material/Cached';
import 'react-toastify/dist/ReactToastify.css';
import { formatLondonDate } from '../../utils/formatters';

export default function Users() {
    document.title = 'Users';

    const EndPoint = 'users';

    const userType = localStorage.getItem("userType");
    const user = JSON.parse(localStorage.getItem("user"));
    const username = user?.username?.toLowerCase() || "";


    const userPermissions = {
        canEdit: true,
        canView: true,
        canDelete: (username === "rif047" || username === "kam"),
    };



    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [viewData, setViewData] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);
    const [tableQuery, setTableQuery] = useState({ page: 1, limit: 10, search: '', sortBy: '', sortDir: 'desc' });
    const [selectedUserType, setSelectedUserType] = useState('All');
    const [userTypes, setUserTypes] = useState(['All', 'Admin', 'Agent', 'Surveyor', 'Designer', 'Management']);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`, {
                params: {
                    page: tableQuery.page,
                    limit: tableQuery.limit,
                    search: tableQuery.search,
                    sortBy: tableQuery.sortBy,
                    sortDir: tableQuery.sortDir,
                    userType: selectedUserType,
                }
            });
            const payload = response.data;
            const rows = Array.isArray(payload) ? payload : (payload?.rows || []);
            setData(rows);
            setTotalRows(Array.isArray(payload) ? rows.length : Number(payload?.total || 0));
            if (payload?.userTypes && Array.isArray(payload.userTypes)) {
                setUserTypes(['All', ...new Set(payload.userTypes)]);
            }
        } catch (error) {
            toast.error('Failed to fetch data. Please try again.');
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [EndPoint, selectedUserType, tableQuery.limit, tableQuery.page, tableQuery.search, tableQuery.sortBy, tableQuery.sortDir]);

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

    const handleDelete = async (row) => {
        if (window.confirm(`Are you sure you want to delete ${row.name.toUpperCase()}?`)) {
            try {
                await axios.delete(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/${row._id}`);
                toast.success(`${row.name.toUpperCase()} deleted.`);
                fetchData();
            } catch (error) {
                toast.error('Failed to delete. Please try again.');
                console.error('Error deleting data:', error);
            }
        }
    };

    const handleAdd = () => {
        setEditData(null);
        setModalOpen(true);
    };

    const handleEdit = (row) => {
        setEditData(row);
        setModalOpen(true);
    };

    const handleView = (row) => {
        setViewData(row);
        setViewModalOpen(true);
    };

    const columns = [
        { id: "createdAt", key: "createdAt", accessorFn: (row) => formatLondonDate(row.createdAt, ''), header: 'Date', maxSize: 70 },
        { id: "name", accessorKey: 'name', header: 'Name', },
        { id: "phone", accessorKey: 'phone', header: 'Phone', enableClickToCopy: true, },
        { id: "email", accessorKey: 'email', header: 'Email' },
        { id: "designation", accessorKey: 'designation', header: 'Designation' },
        { id: "userType", accessorKey: 'userType', header: 'User Type' },
        { id: "assignedCompanies", key: 'assignedCompanies', accessorFn: (row) => (row.assignedCompanies || []).join(', '), header: 'Assigned Companies' },
    ];

    return (
        <Layout>
            <ToastContainer position="bottom-right" autoClose={2000} />

            <section className="leadPageShell">
                <div className="leadPageHeader">
                    <div className='leadPageHeaderLeft'>
                        <h1 className="leadPageTitle">User List</h1>

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

                    <div className='leadPageHeaderActions gap-2'>
                        <select
                            className="leadPageFilterSelect"
                            value={selectedUserType}
                            onChange={(e) => {
                                setSelectedUserType(e.target.value);
                                setTableQuery((prev) => ({ ...prev, page: 1 }));
                            }}
                        >
                            <option value="All">All User Type</option>
                            {userTypes.filter((type) => type !== 'All').map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleAdd}
                            className="inline-flex h-9 items-center rounded-lg bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 cursor-pointer">
                            Create +
                        </button>
                    </div>
                </div>

                <div>
                    <Datatable
                        columns={columns}
                        data={data}
                        onEdit={handleEdit}
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
