import { useState, useEffect } from 'react';
import Layout from '../../../Layout';
import Datatable from '../../../Components/Datatable/Datatable';
import View from './View';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CachedIcon from '@mui/icons-material/Cached';

export default function Managements() {
    document.title = 'Managements';

    const EndPoint = 'users';

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewData, setViewData] = useState(null);


    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`);
            const managements = response.data.filter(user => user.userType === 'Management');
            setData(managements.reverse());
        } catch (error) {
            toast.error('Failed to fetch data. Please try again.');
            console.error('Error fetching managements:', error);
        } finally {
            setLoading(false);
        }
    };


    const handleView = (row) => {
        setViewData(row);
        setViewModalOpen(true);
    };

    useEffect(() => {
        fetchData();
    }, []);


    const columns = [
        { accessorKey: 'name', header: 'Management Name' },
        { accessorKey: 'phone', header: 'Phone', enableClickToCopy: true },
        { accessorKey: 'designation', header: 'Designation' },
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
                        <h1 className="text-lg font-bold">Management List</h1>

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
                            Total: {data.length}
                        </span>
                    </div>
                </div>

                <div className="p-3 md:p-4">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <svg
                                className="h-20 w-20 animate-spin p-4 text-gray-700"
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
                                    strokeDasharray="50"
                                    strokeDashoffset="80"
                                />
                            </svg>
                        </div>
                    ) : (
                        <Datatable
                            columns={columns}
                            data={data}
                            onView={handleView}
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
