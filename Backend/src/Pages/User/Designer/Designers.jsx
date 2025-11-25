import { useState, useEffect } from 'react';
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
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewData, setViewData] = useState(null);


    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`);
            const managements = response.data.filter(user => user.userType === 'Designer');
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
        { accessorKey: 'name', header: 'Designer Name' },
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
            <section className="flex justify-between px-1 md:px-4 py-2 bg-[#4c5165]">
                <div className="flex items-center">
                    <h1 className="font-bold text-sm md:text-lg text-white mr-2">Designer List</h1>

                    {loading ? (
                        <div className="flex items-center text-white">
                            <svg
                                className="animate-spin h-6 w-6 text-white"
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
                        <button className="text-gray-200 cursor-pointer" onClick={fetchData}>
                            <CachedIcon />
                        </button>
                    )}

                    <span className="ml-2 text-xs text-gray-300">
                        Total: {data.length}
                    </span>
                </div>
            </section>


            <section>
                {loading ? (
                    <div className="flex justify-center py-4">
                        <svg
                            className="animate-spin p-5 h-32 w-32 text-gray-700"
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
