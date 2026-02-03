import { useState, useEffect } from 'react';
import Layout from '../../Layout';
import Datatable from '../../Components/Datatable/Datatable';
import Add_Edit from './Add_Edit';
import View from './View';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CachedIcon from '@mui/icons-material/Cached';
import * as XLSX from 'xlsx';


export default function Employees() {
    document.title = 'Employees';

    const EndPoint = 'employees';

    const userType = localStorage.getItem("userType");

    const userPermissions =
        userType === "Admin"
            ? {
                canEdit: true,
                canView: true,
                canDelete: true,
            }
            : {
                canEdit: true,
                canView: true,
                canDelete: false,
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



    const handleExcelImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setLoading(true);

            const reader = new FileReader();

            reader.onload = async (evt) => {
                const binaryStr = evt.target.result;
                const workbook = XLSX.read(binaryStr, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                if (!jsonData.length) { toast.error("Excel file is empty or invalid."); setLoading(false); return; }

                const formattedData = jsonData.map((row) => ({
                    management: row.management || row.Management || "Imported",
                    name: row.name || row.Name,
                    phone: row.phone || row.Phone,
                    alt_phone: row.alt_phone || row["Alternative Phone"] || "",
                    address: row.address || row.Project Address,
                    city: row.city || row.City,
                    preferred_location: row.preferred_location || row["Preferred Location"] || "",
                    availability: row.availability || row.Availability,
                    experience: row.experience || row.Experience,
                    position: row.position || row.Position,
                    right_to_work: row.right_to_work || row["Right to Work"],
                    description: row.description || row.Description || "",
                }));

                await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/bulk`, formattedData);

                toast.success("Data imported successfully!");
                fetchData();
            };

            reader.readAsBinaryString(file);
        } catch (error) {
            console.error("Import error:", error);
            toast.error("Failed to import data. Please check the file format.");
        } finally {
            setLoading(false);
            e.target.value = "";
        }
    };




    const columns = [
        { key: "createdAt", accessorFn: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '', header: 'Date', maxSize: 80 },
        { accessorKey: 'name', header: 'Employee Name' },
        { accessorKey: 'phone', header: 'Phone', enableClickToCopy: true, },
        { accessorKey: 'city', header: 'City' },
        { accessorKey: 'position', header: 'Position' },
        { accessorKey: 'right_to_work', header: 'RTW', maxSize: 60 },
        { accessorKey: 'availability', header: 'Availability', maxSize: 60 },
        { accessorKey: 'management', header: 'Management', maxSize: 60 },
    ];

    columns.forEach(column => {
        if (column.accessorKey !== 'images') {
            column.Cell = ({ cell }) => {
                const value = cell.getValue();
                if (!value) return '';
                const displayValue = String(value);
                return (
                    <span title={displayValue}>
                        {displayValue.slice(0, 40)}{displayValue.length > 40 && '...'}
                    </span>
                );
            };
        }
    });

    return (
        <Layout>
            <ToastContainer position="bottom-right" autoClose={2000} />

            <section className="flex justify-between px-1 md:px-4 py-2 bg-[#4c5165]">

                <div className='flex justify-center items-center'>
                    <h1 className="font-bold text-sm md:text-lg text-white mr-2">Employee List</h1>

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

                <div className="flex gap-3 items-center">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => document.getElementById('importExcelInput').click()}
                            className="flex items-center gap-2 bg-white text-gray-700 px-6 py-2 rounded-xl font-semibold text-sm shadow-sm border border-gray-200 hover:bg-gray-100 hover:shadow transition-all duration-200 cursor-pointer"
                        >
                            📥 Import
                        </button>

                        <a
                            href="https://docs.google.com/spreadsheets/d/1lUUPi6LoTXKuZXDPAPjDaq4oyewyL29dYETiDg_s-N0/edit?gid=0#gid=0"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-white text-gray-700 px-6 py-2 rounded-xl font-semibold text-sm shadow-sm border border-gray-200 hover:bg-gray-100 hover:shadow transition-all duration-200 cursor-pointer"
                        >
                            📄 Import Template
                        </a>
                    </div>



                    <input
                        id="importExcelInput"
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        onChange={handleExcelImport}
                    />

                    <button
                        onClick={handleAdd}
                        className="flex items-center gap-2 bg-white text-gray-700 px-6 py-2 rounded-xl font-semibold text-sm shadow-sm border border-gray-200 hover:bg-gray-100 hover:shadow transition-all duration-200 cursor-pointer"
                    >
                        Create +
                    </button>
                </div>

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