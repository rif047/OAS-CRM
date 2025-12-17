import { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import Layout from '../../../Layout';
import Datatable from '../../../Components/Datatable/Datatable';
import View from './View';
import Add_Edit from './Add_Edit';
import axios from 'axios';
import CachedIcon from '@mui/icons-material/Cached';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import TourIcon from '@mui/icons-material/Tour';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import 'react-toastify/dist/ReactToastify.css';

export default function In_Quote() {
    document.title = 'In Quote';

    const EndPoint = 'leads';

    const userPermissions = {
        canEdit: true,
        canView: true,
        canDelete: false,
    };

    const startRef = useRef(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [viewData, setViewData] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const [selectedCompany, setSelectedCompany] = useState("All");
    const [companies, setCompanies] = useState([]);

    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [drawingModalOpen, setDrawingModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [form, setForm] = useState({ agent: "", surveyor: "", survey_date: "", design_deadline: "", designer: "", description: "" });
    const [projectRemark, setProjectRemark] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`);
            const filteredData = response.data.filter(item => item.status === "In_Quote");

            const uniqueCompanies = [...new Set(filteredData.map(item => item.company))].filter(Boolean);
            setCompanies(uniqueCompanies);

            const filteredByCompany = selectedCompany === "All"
                ? filteredData
                : filteredData.filter(item => item.company === selectedCompany);

            setData(filteredByCompany.reverse());
        } catch {
            toast.error('Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusClick = async (row) => {
        const loggedUser = JSON.parse(localStorage.getItem('user'));
        setSelectedRow(row);

        setForm({
            agent: loggedUser?.name || "",
            surveyor: row.surveyor || "",
            survey_date: row.survey_date || "",
            description: ""
        });

        setStatusModalOpen(true);
    };

    const handleDrawingClick = async (row) => {
        setSelectedRow(row);
        setProjectRemark("");
        setDrawingModalOpen(true);
    };

    const handleDrawingSubmit = async () => {
        if (!projectRemark.trim()) {
            toast.error("Please enter a description.");
            return;
        }

        try {
            const loggedUser = JSON.parse(localStorage.getItem('user'));

            await axios.patch(
                `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/in_design/${selectedRow._id}`,
                {
                    agent: loggedUser?.name || "",
                    design_deadline: form.design_deadline,
                    designer: form.designer,
                    description: selectedRow.description ? selectedRow.description + "\n" + projectRemark : projectRemark
                }
            );

            toast.success("Project moved to Project Phase!");
            fetchData();
            setDrawingModalOpen(false);
        } catch (error) {
            toast.error("Failed to update. Please try again.");
        }
    };

    const handleStatusSubmit = async () => {
        try {
            await axios.patch(
                `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/in_survey/${selectedRow._id}`,
                {
                    agent: form.agent,
                    surveyor: form.surveyor,
                    survey_date: form.survey_date,
                    description: selectedRow.description ? selectedRow.description + "\n" + form.description : form.description
                }
            );

            toast.success("Project moved to next step!");
            fetchData();
            setStatusModalOpen(false);
        } catch {
            toast.error("Please complete all fields.");
        }
    };

    const handleToPending = async (row) => {
        if (window.confirm(`Move back to leads - ${row.leadCode.toUpperCase()}?`)) {
            try {
                const loggedUser = JSON.parse(localStorage.getItem('user'));
                await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/pending/${row._id}`, { agent: loggedUser?.name || "" });

                toast.success("Project moved to leads");
                fetchData();
            } catch {
                toast.error("Failed to mark as Cancelled.");
            }
        }
    };

    const handleDelete = async (row) => {
        if (window.confirm(`Are you sure you want to delete ${row.leadCode.toUpperCase()}?`)) {
            try {
                await axios.delete(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/${row._id}`);
                toast.success(`${row.leadCode.toUpperCase()} deleted.`);
                fetchData();
            } catch (error) {
                toast.error('Failed to delete. Please try again.');
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

    useEffect(() => { fetchData(); }, [selectedCompany]);

    const columns = [
        { key: "in_quote_date", accessorKey: 'in_quote_date', header: 'Date', maxSize: 80 },
        { key: "leadCode", accessorKey: 'leadCode', header: 'Code', maxSize: 80 },
        { accessorFn: row => `${row.client?.name} (${row.client?.phone})`, header: 'Client' },
        { key: "project_type", accessorKey: 'project_type', header: 'Project Type' },
        { key: "quote_price", header: "Quoted P.", accessorFn: row => `£${row.quote_price || 0}`, maxSize: 80 },
        { key: "source", accessorKey: 'source', header: 'Source' },
        {
            key: "actions", header: 'Set Status', maxSize: 80,
            Cell: ({ row }) => (
                <div className='flex'>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleStatusClick(row.original); }}
                        className="text-emerald-600 font-bold flex items-center cursor-pointer border-r-2 pr-2"
                        title="Move to Survey"
                    >
                        <span className="text-xs mr-1 text-center">Survey</span>
                        <TourIcon fontSize="small" />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleDrawingClick(row.original); }}
                        className="text-gray-600 font-bold flex items-center cursor-pointer border-r-2 px-2"
                        title="Move to Project Phase"
                    >
                        <span className="text-xs mr-1 text-center">Project Phase</span>
                        <DesignServicesIcon fontSize="small" />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleToPending(row.original); }}
                        className="text-red-400 font-bold flex items-center cursor-pointer ml-2"
                        title="Move to Cancelled"
                    >
                        <span className="text-xs mr-1 text-center">Cancel</span>
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
                    <h1 className="font-bold text-sm md:text-lg text-white mr-2">Under Quote</h1>

                    {loading ? (
                        <div className="flex justify-center items-center text-white">
                            <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="3" strokeDasharray="10" strokeDashoffset="75" />
                            </svg>
                        </div>
                    ) : <button className="text-gray-200 cursor-pointer" onClick={fetchData}><CachedIcon /></button>
                    }

                    <span className="ml-2 text-xs text-gray-300">
                        Total: {data.length}
                    </span>
                </div>

                <select
                    className="mr-4 px-3 py-1.5 rounded-md bg-gray-700 text-sm text-white border border-gray-500 focus:outline-none cursor-pointer"
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                >
                    <option value="All">All Companies</option>
                    {companies.map((company, index) => (
                        <option key={index} value={company}>{company}</option>
                    ))}
                </select>
            </section>

            <section>
                {loading ? (
                    <div className="flex justify-center py-4">
                        <svg className="animate-spin p-5 h-32 w-32 text-gray-700" viewBox="0 0 24 24" fill="none">
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

            <Dialog open={statusModalOpen} onClose={() => setStatusModalOpen(false)} maxWidth='sm'>
                <DialogTitle><b>Send Site Survey</b></DialogTitle>

                <DialogContent>
                    <div onClick={() => startRef.current.showPicker()}>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Survey Date*
                        </label>
                        <input
                            ref={startRef}
                            type="date"
                            value={form.survey_date}
                            onChange={e => setForm({ ...form, survey_date: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#4ea863] focus:border-transparent text-sm cursor-pointer"
                        />
                    </div>


                    <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        label="Surveyor*"
                        value={form.surveyor}
                        onChange={e => setForm({ ...form, surveyor: e.target.value })}
                    />



                    <TextField
                        fullWidth
                        label="Add Description"
                        size="small"
                        margin="normal"
                        multiline
                        minRows={4}
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                    />

                    <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        label="Previous Description"
                        value={selectedRow?.description || ""}
                        disabled
                        multiline
                        minRows={3}
                    />
                </DialogContent>

                <small className='text-gray-600 mx-auto my-2'>All fields are required.</small>

                <DialogActions>
                    <Button fullWidth variant="contained" onClick={handleStatusSubmit} className="bg-[#272e3f]! hover:bg-gray-700! font-bold!"> Submit </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={drawingModalOpen} onClose={() => setDrawingModalOpen(false)} maxWidth='sm'>
                <DialogTitle>
                    <b>Move to Project Phase - {selectedRow?.leadCode?.toUpperCase()}</b>
                </DialogTitle>



                <DialogContent>
                    <div onClick={() => startRef.current.showPicker()}>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Deadline*
                        </label>
                        <input
                            ref={startRef}
                            type="date"
                            value={form.design_deadline}
                            onChange={e => setForm({ ...form, design_deadline: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#4ea863] focus:border-transparent text-sm cursor-pointer"
                        />
                    </div>


                    <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        label="Designer*"
                        value={form.designer}
                        onChange={e => setForm({ ...form, designer: e.target.value })}
                    />


                    <TextField
                        fullWidth
                        label="Description*"
                        size="small"
                        margin="normal"
                        multiline
                        minRows={4}
                        value={projectRemark}
                        onChange={e => setProjectRemark(e.target.value)}
                        placeholder="Enter description for moving to project phase..."
                    />

                    <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        label="Previous Description"
                        value={selectedRow?.description || ""}
                        disabled
                        multiline
                        minRows={3}
                    />
                </DialogContent>

                <small className='text-gray-600 mx-auto my-2'>Description is required.</small>

                <DialogActions>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleDrawingSubmit}
                        className="bg-[#272e3f]! hover:bg-gray-700! font-bold!"
                    >
                        Move to Project Phase
                    </Button>
                </DialogActions>
            </Dialog>
        </Layout>
    );
}