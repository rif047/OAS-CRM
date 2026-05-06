import { useState, useEffect, useMemo } from 'react';
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
    const isManagementUser = userType === "Management";
    const user = JSON.parse(localStorage.getItem("user"));
    const username = user?.username?.toLowerCase() || "";


    const userPermissions = {
        canEdit: !isManagementUser,
        canView: !isManagementUser,
        canDelete: !isManagementUser && (username === "rif047" || username === "kam"),
    };



    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [viewData, setViewData] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedUserType, setSelectedUserType] = useState('All');


    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`);
            const reversedData = response.data.reverse();
            setData(reversedData);
        } catch (error) {
            toast.error('Failed to fetch data. Please try again.');
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };


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

    useEffect(() => {
        fetchData();
    }, []);

    const userTypes = useMemo(() => {
        const uniqueTypes = [...new Set(data.map((item) => item?.userType).filter(Boolean))];
        return ['All', ...uniqueTypes];
    }, [data]);

    const filteredData = useMemo(() => {
        if (selectedUserType === 'All') return data;
        return data.filter((item) => item?.userType === selectedUserType);
    }, [data, selectedUserType]);



    const columns = [
        { key: "createdAt", accessorFn: (row) => formatLondonDate(row.createdAt, ''), header: 'Date', maxSize: 70 },
        { accessorKey: 'name', header: 'Name', },
        { accessorKey: 'phone', header: 'Phone', enableClickToCopy: true, },
        { accessorKey: 'email', header: 'Email' },
        { accessorKey: 'designation', header: 'Designation' },
        { accessorKey: 'userType', header: 'User Type' },
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
                            Total: {filteredData.length}
                        </span>
                    </div>

                    <div className='leadPageHeaderActions gap-2'>
                        <select
                            className="leadPageFilterSelect"
                            value={selectedUserType}
                            onChange={(e) => setSelectedUserType(e.target.value)}
                        >
                            <option value="All">All User Type</option>
                            {userTypes.filter((type) => type !== 'All').map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        {!isManagementUser && (
                            <button
                                onClick={handleAdd}
                                className="inline-flex h-9 items-center rounded-lg bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 cursor-pointer">
                                Create +
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <svg className="h-20 w-20 animate-spin p-4 text-gray-700" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="3" strokeDasharray="50" strokeDashoffset="80" />
                            </svg>
                        </div>
                    ) : (
                        <Datatable
                            columns={columns}
                            data={filteredData}
                            onEdit={handleEdit}
                            onView={handleView}
                            onDelete={handleDelete}
                            permissions={userPermissions}
                        />
                    )}
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
