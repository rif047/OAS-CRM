import { useState, useEffect } from 'react';
import Layout from '../../../Layout';
import Datatable from '../../../Components/Datatable/Datatable';
import View from './View';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CachedIcon from '@mui/icons-material/Cached';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete } from '@mui/material';

export default function PendingPayment() {
    document.title = 'Pending Payments';

    const EndPoint = 'leads';

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

    const [selectedStatus, setSelectedStatus] = useState("closed");
    const [employees, setEmployees] = useState([]);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [form, setForm] = useState({ management: "", employee: "", fee: "", wages: "", remark: "" });


    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`);

            const filteredData = response.data.filter(item => item.status === "PendingPayment");

            setData(filteredData.reverse());
        } catch (error) {
            toast.error('Failed to fetch data. Please try again.');
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };


    const fetchEmployees = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/employees`);
            setEmployees(res.data.reverse());
        } catch {
            toast.error("Failed to fetch employees");
        }
    };


    const handleStatusClick = async (row, type = "Closed") => {
        const loggedUser = JSON.parse(localStorage.getItem('user'));
        setSelectedRow(row);

        setForm({
            management: loggedUser?.name || "",
            employee: "",
            fee: row.fee || "",
            wages: row.wages || "",
            remark: row.remark || ""
        });

        await fetchEmployees();
        setStatusModalOpen(true);
        setSelectedStatus(type);
    };


    const handleStatusSubmit = async () => {
        try {
            const url =
                selectedStatus === "Pending"
                    ? `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/deal_cancelled/${selectedRow._id}`
                    : `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/closed/${selectedRow._id}`;

            await axios.patch(url, {
                ...form,
                status: selectedStatus,
            });

            toast.success(
                selectedStatus === "Pending"
                    ? "Lead marked as Cancelled!"
                    : "Lead moved to next step!"
            );
            fetchData();
            setStatusModalOpen(false);
        } catch {
            toast.error("Please complete all fields.");
        }
    };


    const handleToPending = async (row) => {
        if (window.confirm(`Move to Hot Leads ${row.position.toUpperCase()}?`)) {
            try {
                await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/deal_cancelled/${row._id}`, {
                    ...form,
                    status: "Pending"
                });
                toast.success("Lead marked as Cancelled!");
                fetchData();
            } catch {
                toast.error("Failed to mark as Cancelled.");
            }
        }
    };



    const handleDelete = async (row) => {
        if (window.confirm(`Are you sure you want to delete ${row.position.toUpperCase()}?`)) {
            try {
                await axios.delete(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/${row._id}`);
                toast.success(`${row.position.toUpperCase()} deleted.`);
                fetchData();
            } catch (error) {
                toast.error('Failed to delete. Please try again.');
                console.error('Error deleting data:', error);
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

    useEffect(() => {
        fetchData();
    }, []);



    const columns = [
        { key: "date", accessorKey: 'date', header: 'Date', maxSize: 80 },
        { key: "client", accessorKey: 'client', header: 'Client' },
        { key: "employee", accessorKey: 'employee', header: 'Employee' },
        { key: "position", accessorKey: 'position', header: 'Position' },
        { key: "city", accessorKey: 'city', header: 'City' },
        { key: "wages", accessorFn: row => `£${row.wages}`, header: 'Wage', maxSize: 60 },
        { key: "fee", accessorFn: row => `£${row.fee}`, header: 'Fees', maxSize: 60 },
        { key: "advance_fee", accessorFn: row => `£${row.advance_fee}`, header: 'Advance', maxSize: 60 },
        { key: "management", accessorKey: 'management', header: 'management', maxSize: 80 },
        {
            key: "actions", header: 'Set Status', maxSize: 50,
            Cell: ({ row }) => (
                <div className='flex'>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleStatusClick(row.original, "Closed"); }}
                        className="text-gray-600 font-bold flex items-center cursor-pointer border-r-2 pr-2">
                        <span className="text-xs mr-1 text-center ">Close</span>
                        <TaskAltIcon fontSize="small" />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleToPending(row.original); }}
                        className="text-red-400 font-bold flex items-center cursor-pointer ml-3">
                        <span className="text-xs mr-1 text-center ">Cancel</span>
                        <HighlightOffIcon fontSize="small" />
                    </button>


                </div>
            )
        }
    ];

    return (
        <Layout>
            <ToastContainer position="bottom-right" autoClose={2000} />

            <section className="flex justify-between px-1 md:px-4 py-2 bg-[#4c5165]">
                <div className='flex justify-center items-center'>
                    <h1 className="font-bold text-sm md:text-lg text-white mr-2">Pending Payments</h1>

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

            <Dialog open={statusModalOpen} onClose={() => setStatusModalOpen(false)} maxWidth='xs'>
                <DialogTitle><b>Close Deal</b></DialogTitle>

                <DialogContent>
                    <Autocomplete
                        fullWidth
                        size="small"
                        options={employees}
                        getOptionLabel={o => `${o.name} (${o.phone})`}
                        value={employees.find(emp => `${emp.name} (${emp.phone})` === form.employee) || null}
                        onChange={(e, v) => setForm({ ...form, employee: v ? `${v.name} (${v.phone})` : "" })}
                        autoHighlight
                        selectOnFocus
                        clearOnBlur
                        handleHomeEndKeys
                        renderInput={p => (
                            <TextField
                                {...p}
                                label="Select Employee*"
                                margin="normal"
                            />
                        )}
                    />

                    <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        label="Final Fees*"
                        value={form.fee}
                        onChange={e => setForm({ ...form, fee: e.target.value })}
                    />

                    <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        label="Wages*"
                        value={form.wages}
                        onChange={e => setForm({ ...form, wages: e.target.value })}
                    />

                    <TextField
                        fullWidth
                        label="Remark"
                        size="small"
                        margin="normal"
                        multiline
                        minRows={4}
                        value={form.remark}
                        onChange={e => setForm({ ...form, remark: e.target.value })}
                    />


                </DialogContent>
                <small className='text-gray-600 mx-auto my-2'>All fields are required.</small>
                <DialogActions>
                    <Button fullWidth variant="contained" onClick={handleStatusSubmit} className="bg-[#272e3f]! hover:bg-gray-700! font-bold!">
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </Layout>
    );
}