import { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from '../../Layout';
import Datatable from '../../Components/Datatable/Datatable';
import Add_Edit from './Add_Edit';
import View from './View';
import axios from 'axios';
import CachedIcon from '@mui/icons-material/Cached';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';

export default function Leads() {
    document.title = 'Leads';

    const EndPoint = 'leads';
    const userType = localStorage.getItem("userType");

    const userPermissions =
        userType === "Admin"
            ? { canEdit: true, canView: true, canDelete: true }
            : { canEdit: true, canView: true, canDelete: false };

    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [viewData, setViewData] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("");
    const [selectedRow, setSelectedRow] = useState(null);
    const [form, setForm] = useState({ agent: "", quote_file: "", remark: "" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`);
            const filteredData = response.data.filter(item => item.status === "Pending");
            setData(filteredData.reverse());
        } catch {
            toast.error('Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleStatusClick = (row) => {
        const user = JSON.parse(localStorage.getItem("user"));
        setSelectedRow(row);
        setForm({ agent: user?.name || "", quote_file: "", remark: "" });
        setSelectedStatus("In_Quote");
        setStatusModalOpen(true);
    };

    const handleCancelled = (row) => {
        const user = JSON.parse(localStorage.getItem("user"));
        setSelectedRow(row);
        setForm({ agent: user?.name || "", remark: "" });
        setSelectedStatus("Cancelled");
        setStatusModalOpen(true);
    };

    const handleStatusSubmit = async () => {
        try {
            let url = "";
            if (selectedStatus === "Cancelled") {
                url = `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/cancelled/${selectedRow._id}`;
            } else {
                url = `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/in_quote/${selectedRow._id}`;
            }

            await axios.patch(url, { ...form, status: selectedStatus });
            toast.success(
                selectedStatus === "Cancelled" ? "Lead Cancelled!" : "Quotation Sent. Moved to In Quotation!"
            );
            fetchData();
            setStatusModalOpen(false);
        } catch {
            toast.error("Please complete all fields.");
        }
    };

    const handleDelete = async (row) => {
        if (window.confirm(`Delete ${row.position.toUpperCase()}?`)) {
            try {
                await axios.delete(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/${row._id}`);
                toast.success('Deleted successfully.');
                fetchData();
            } catch {
                toast.error('Failed to delete.');
            }
        }
    };

    const handleAdd = () => { setEditData(null); setModalOpen(true); };
    const handleEdit = (row) => { setEditData(row); setModalOpen(true); };
    const handleView = (row) => { setViewData(row); setViewModalOpen(true); };

    const columns = [
        { key: "createdAt", accessorFn: (row) => new Date(row.createdAt).toLocaleDateString(), header: 'Date' },
        { key: "leadCode", accessorKey: 'leadCode', header: 'Code' },
        { accessorFn: row => `${row.client?.name} (${row.client?.phone})`, header: 'Client' },
        { key: "company", accessorKey: 'company', header: 'Company' },
        { key: "agent", accessorKey: 'agent', header: 'Agent' },
        {
            key: "actions", header: 'Set Status',
            Cell: ({ row }) => (
                <div className='flex'>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleStatusClick(row.original); }}
                        className="text-blue-500 font-bold flex items-center cursor-pointer">
                        <span className="text-xs mr-1">Send Quote</span>
                        <EventRepeatIcon fontSize="small" />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleCancelled(row.original); }}
                        className="text-red-500 font-bold flex items-center cursor-pointer ml-3">
                        <span className="text-xs mr-1">Cancel</span>
                        <HighlightOffIcon fontSize="small" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <Layout>
            <ToastContainer position="bottom-right" autoClose={2000} />

            <section className="flex justify-between px-4 py-2 bg-[#272e3f] shadow">
                <div className='flex items-center text-white'>
                    <h1 className="font-bold text-lg mr-2">Potential Leads</h1>
                    {loading ? (
                        <div className="flex justify-center items-center text-white">
                            <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="3" strokeDasharray="10" strokeDashoffset="75" />
                            </svg>
                        </div>
                    ) : <button className="text-gray-200 cursor-pointer" onClick={fetchData}><CachedIcon /></button>
                    }
                    <span className="ml-2 text-xs text-gray-300">Total: {data.length}</span>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-white text-gray-700 px-6 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 transition cursor-pointer">
                    Create +
                </button>
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
                <DialogTitle>
                    <b>{selectedStatus === "Cancelled" ? "Cancel Lead" : "Send Quote"}</b>
                </DialogTitle>
                <DialogContent>
                    {selectedStatus === "Cancelled" ? (
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
                    ) : (
                        <>
                            <TextField
                                fullWidth
                                label="Insert Quote File Link"
                                size="small"
                                margin="normal"
                                value={form.quote_file}
                                onChange={e => setForm({ ...form, quote_file: e.target.value })}
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
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button fullWidth variant="contained" onClick={handleStatusSubmit} className="bg-[#272e3f]! hover:bg-gray-700! font-bold!">
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </Layout>
    );
}
