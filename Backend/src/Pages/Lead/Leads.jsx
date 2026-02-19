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
import CommentIcon from '@mui/icons-material/Comment';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import RichTextEditor from "../../Components/RichTextEditor";

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

    const [selectedCompany, setSelectedCompany] = useState("All");
    const [companies, setCompanies] = useState([]);

    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("");
    const [selectedRow, setSelectedRow] = useState(null);
    const [form, setForm] = useState({ agent: "", quote_price: "", quote_file: "", description: "" });
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [commentForm, setCommentForm] = useState({ agent: "", description: "" });






    const [stageModalOpen, setStageModalOpen] = useState(false);
    const [stageForm, setStageForm] = useState({
        stage: "",
        description: ""
    });
    const [stageErrors, setStageErrors] = useState({});
    const isRichTextEmpty = (html = "") => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim() === "";
    const handleStageClick = (row) => {
        document.activeElement?.blur?.();
        setSelectedRow(row);
        setStageForm({
            stage: row.stage || "",
            description: ""
        });
        setStageErrors({});
        setStageModalOpen(true);
    };


    const handleStageSubmit = async () => {
        const errors = {};
        if (!stageForm.stage) errors.stage = "Stage required";
        if (!stageForm.description) errors.description = "Description required";

        setStageErrors(errors);
        if (Object.keys(errors).length) return;

        const user = JSON.parse(localStorage.getItem("user"));

        const previousDescription = selectedRow.description || "";

        const finalDescription = `
                    ${previousDescription}
                    <hr />
                    <p><b>Stage -  ${stageForm.stage}</b></p>
                    ${stageForm.description} 
                `;


        try {
            await axios.patch(
                `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/${selectedRow._id}`,
                {
                    company: selectedRow.company,
                    client: selectedRow.client?._id || selectedRow.client,
                    source: selectedRow.source,

                    stage: stageForm.stage,
                    description: finalDescription,
                    agent: user?.name
                }
            );

            toast.success("Stage updated");
            fetchData();
            setStageModalOpen(false);
        } catch {
            toast.error("Failed to update stage");
        }
    };









    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`, {
                params: { status: "Pending" }
            });
            const filteredData = response.data;

            const uniqueCompanies = [...new Set(filteredData.map(item => item.company))].filter(Boolean);
            setCompanies(uniqueCompanies);

            const filteredByCompany = selectedCompany === "All"
                ? filteredData
                : filteredData.filter(item => item.company === selectedCompany);

            setData(filteredByCompany);
        } catch {
            toast.error('Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [selectedCompany]);

    const handleStatusClick = (row) => {
        document.activeElement?.blur?.();
        const user = JSON.parse(localStorage.getItem("user"));
        setSelectedRow(row);
        setForm({ agent: user?.name || "", quote_price: "", quote_file: "", description: "" });
        setSelectedStatus("In_Quote");
        setStatusModalOpen(true);
    };

    const handleCancelled = (row) => {
        document.activeElement?.blur?.();
        const user = JSON.parse(localStorage.getItem("user"));

        setSelectedRow(row);
        setForm({ agent: user?.name || "", description: "" });
        setSelectedStatus("Lost_Lead");
        setStatusModalOpen(true);
    };

    const handleStatusSubmit = async () => {
        try {
            let url = "";
            if (selectedStatus === "Lost_Lead") {
                url = `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/lost_lead/${selectedRow._id}`;
            } else {
                url = `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/in_quote/${selectedRow._id}`;
            }

            await axios.patch(url, { ...form, status: selectedStatus });
            toast.success(
                selectedStatus === "Lost_Lead" ? "Lead Lost_Lead!" : "Quotation Sent. Moved to In Quotation!"
            );
            fetchData();
            setStatusModalOpen(false);
        } catch {
            toast.error("Please complete all fields.");
        }
    };

    const handleDelete = async (row) => {
        if (window.confirm(`Delete ${row.leadCode.toUpperCase()}?`)) {
            try {
                await axios.delete(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/${row._id}`);
                toast.success('Deleted successfully.');
                fetchData();
            } catch {
                toast.error('Failed to delete.');
            }
        }
    };

    const handleAdd = () => { document.activeElement?.blur?.(); setEditData(null); setModalOpen(true); };
    const handleEdit = (row) => { document.activeElement?.blur?.(); setEditData(row); setModalOpen(true); };
    const handleView = (row) => { document.activeElement?.blur?.(); setViewData(row); setViewModalOpen(true); };
    const handleCommentClick = (row) => {
        document.activeElement?.blur?.();
        const user = JSON.parse(localStorage.getItem("user"));
        setSelectedRow(row);
        setCommentForm({ agent: user?.name || "", description: "" });
        setCommentModalOpen(true);
    };

    const handleCommentSubmit = async () => {
        if (isRichTextEmpty(commentForm.description)) {
            toast.error("Description is required.");
            return;
        }

        try {
            await axios.patch(
                `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/comment/${selectedRow._id}`,
                commentForm
            );
            toast.success("Comment added successfully.");
            fetchData();
            setCommentModalOpen(false);
        } catch {
            toast.error("Failed to add comment.");
        }
    };

    const columns = [
        { key: "createdAt", accessorFn: (row) => new Date(row.createdAt).toLocaleDateString(), header: 'Date', maxSize: 80 },
        { key: "leadCode", accessorKey: 'leadCode', header: 'Code', maxSize: 80 },
        { accessorFn: row => row.client?.phone ? `${row.client?.name || "N/A"} (${row.client.phone})` : (row.client?.name || "N/A"), header: 'Client' },
        { key: "project_type", accessorKey: 'project_type', header: 'Project Type' },
        { key: "budget", header: "Budget", accessorFn: row => `£${row.budget || 0}`, maxSize: 80 },
        { key: "source", accessorKey: 'source', header: 'Source' },
        {
            key: "stage",
            header: "Stage",
            maxSize: 120,
            Cell: ({ row }) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleStageClick(row.original);
                    }}
                    className="px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
                >
                    {row.original.stage}
                </button>
            )
        },

        {
            id: "setStatus",
            key: "actions",
            header: 'Set Status',
            size: 1,
            minSize: 1,
            maxSize: 420,
            grow: false,
            Cell: ({ row }) => (
                <div className='inline-flex w-max items-center gap-2 whitespace-nowrap'>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleStatusClick(row.original); }}
                        className="text-cyan-600 font-bold flex items-center cursor-pointer">
                        <span className="text-xs mr-1">Quote</span>
                        <EventRepeatIcon fontSize="small" />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleCancelled(row.original); }}
                        className="text-red-500 font-bold flex items-center cursor-pointer">
                        <span className="text-xs mr-1">Lost</span>
                        <HighlightOffIcon fontSize="small" />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleCommentClick(row.original); }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-200 cursor-pointer"
                        title="Add Comment"
                    >
                        <span>Comment</span>
                        <CommentIcon sx={{ fontSize: 15 }} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <Layout>
            <ToastContainer position="bottom-right" autoClose={2000} />

            <section className="overflow-hidden rounded-xl border border-[#F0F0F0] bg-white shadow-sm">
                <div className="flex flex-col gap-3 bg-[#4c5165] px-4 py-3 md:flex-row md:items-center md:justify-between">
                    <div className='flex items-center gap-2 text-white'>
                        <h1 className="text-lg font-bold">Project Leads</h1>
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
                        <select
                            className="rounded-md border border-gray-500 bg-gray-700 px-3 py-2 text-sm text-white focus:outline-none cursor-pointer"
                            value={selectedCompany}
                            onChange={(e) => setSelectedCompany(e.target.value)}
                        >
                            <option value="All">All Companies</option>
                            {companies.map((company, index) => (
                                <option key={index} value={company}>{company}</option>
                            ))}
                        </select>

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
                    hideDescriptionOnEdit={true}
                />
            )}

            {viewModalOpen && (
                <View
                    open={viewModalOpen}
                    onClose={() => setViewModalOpen(false)}
                    viewData={viewData}
                />
            )}

            <Dialog open={statusModalOpen} onClose={() => setStatusModalOpen(false)} fullWidth maxWidth='sm'>
                <DialogTitle>
                    <b>{selectedStatus === "Lost_Lead" ? "Write Reason" : "Sent Quote"}</b>
                </DialogTitle>
                <DialogContent>
                    {selectedStatus === "Lost_Lead" ? (
                        <RichTextEditor
                            value={form.description}
                            onChange={(html) =>
                                setForm(prev => ({ ...prev, description: html }))
                            }
                        />
                    ) : (
                        <>
                            <TextField
                                fullWidth
                                label="Quoted Price £*"
                                size="small"
                                margin="normal"
                                type='number'
                                value={form.quote_price}
                                onChange={e => setForm({ ...form, quote_price: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                label="Quote File Link*"
                                size="small"
                                margin="normal"
                                value={form.quote_file}
                                onChange={e => setForm({ ...form, quote_file: e.target.value })}
                            />

                            <RichTextEditor
                                value={form.description}
                                onChange={(html) =>
                                    setForm(prev => ({ ...prev, description: html }))
                                }
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

            <Dialog
                open={commentModalOpen}
                onClose={() => setCommentModalOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    <b>Write Comment</b>
                </DialogTitle>

                <DialogContent>
                    <RichTextEditor
                        value={commentForm.description}
                        enableImageUpload
                        imageUploadUrl={`${import.meta.env.VITE_SERVER_URL}/api/leads/description-images`}
                        onChange={(html) =>
                            setCommentForm(prev => ({ ...prev, description: html }))
                        }
                    />
                </DialogContent>

                <DialogActions>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleCommentSubmit}
                        className="bg-[#272e3f]! hover:bg-gray-700! font-bold!"
                    >
                        Submit Comment
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={stageModalOpen}
                onClose={() => setStageModalOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    <b>Change Stage</b>
                </DialogTitle>

                <DialogContent>
                    <TextField
                        select
                        fullWidth
                        margin="normal"
                        SelectProps={{ native: true }}
                        value={stageForm.stage}
                        onChange={(e) =>
                            setStageForm(prev => ({ ...prev, stage: e.target.value }))
                        }
                        error={!!stageErrors.stage}
                        helperText={stageErrors.stage}
                    >
                        <option value="">Stage*</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Not Interested">Not Interested</option>
                        <option value="Decision Pending">Decision Pending</option>
                    </TextField>

                    <RichTextEditor
                        value={stageForm.description}
                        onChange={(html) =>
                            setStageForm(prev => ({ ...prev, description: html }))
                        }
                    />
                    {stageErrors.description && (
                        <p className="text-red-500 text-sm mt-1">
                            {stageErrors.description}
                        </p>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleStageSubmit}
                        className="bg-[#272e3f]! hover:bg-gray-700! font-bold!"
                    >
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>

        </Layout>
    );
}
