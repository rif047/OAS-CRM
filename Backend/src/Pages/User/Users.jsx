import { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import Layout from '../../Layout';
import Datatable from '../../Components/Datatable/Datatable';
import Add_Edit from './Add_Edit';
import View from './View';
import axios from 'axios';
import CachedIcon from '@mui/icons-material/Cached';
import 'react-toastify/dist/ReactToastify.css';

export default function Users() {
    document.title = 'Users';

    const EndPoint = 'users';


    const user = JSON.parse(localStorage.getItem("user"));
    const username = user?.username?.toLowerCase() || "";


    const userPermissions = {
        canEdit: true,
        canView: true,
        canDelete: username === "rif047" || username === "kam",
    };



    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [viewData, setViewData] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);


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



    const columns = [
        { accessorKey: 'name', header: 'Name', },
        { accessorKey: 'phone', header: 'Phone', enableClickToCopy: true, },
        { accessorKey: 'email', header: 'Email' },
        { accessorKey: 'designation', header: 'Designation' },
        { accessorKey: 'userType', header: 'User Type' },
    ];

    return (
        <Layout>
            <ToastContainer position="bottom-right" autoClose={2000} />

            <section className="overflow-hidden rounded-xl border border-[#F0F0F0] bg-white shadow-sm">
                <div className="flex flex-col gap-3 bg-[#4c5165] px-4 py-3 md:flex-row md:items-center md:justify-between">
                    <div className='flex items-center gap-2 text-white'>
                        <h1 className="text-lg font-bold">User List</h1>

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
                        <button
                            onClick={handleAdd}
                            className="rounded-lg bg-white px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer">
                            Create +
                        </button>
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
