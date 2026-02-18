import { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import Layout from '../../../Layout';
import Datatable from '../../../Components/Datatable/Datatable';
import View from './View';
import Add_Edit from '../In_Quote/Add_Edit';
import axios from 'axios';
import CachedIcon from '@mui/icons-material/Cached';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CommentIcon from '@mui/icons-material/Comment';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import 'react-toastify/dist/ReactToastify.css';
import RichTextEditor from "../../../Components/RichTextEditor";


export default function Project_Phase() {
    document.title = 'Drawing Phase';


    const EndPoint = 'leads';

    const loggedUser = JSON.parse(localStorage.getItem("user"));

    const isAdminOrManagement = loggedUser?.userType === "Admin" || loggedUser?.userType === "Management";

    const userPermissions = {
        canEdit: isAdminOrManagement,
        canView: true,
        canDelete: false,
    };

    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [viewData, setViewData] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const [selectedCompany, setSelectedCompany] = useState("All");
    const [companies, setCompanies] = useState([]);

    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [form, setForm] = useState({ agent: "", design_file: "", description: "" });
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [commentForm, setCommentForm] = useState({ agent: "", description: "" });
    const isRichTextEmpty = (html = "") => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim() === "";

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`);
            const filteredData = response.data.filter(item => item.status === "In_Design");

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
            description: ""
        });

        setStatusModalOpen(true);
    };

    const handleStatusSubmit = async () => {
        try {
            await axios.patch(
                `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/in_review/${selectedRow._id}`,
                {
                    agent: form.agent,
                    design_file: form.design_file,
                    // description: selectedRow.description ? selectedRow.description + "\n" + form.description : form.description
                    // description: selectedRow.description ? selectedRow.description + "<br>" + form.description : form.description
                    description: form.description

                }
            );

            toast.success("Project moved to review");
            fetchData();
            setStatusModalOpen(false);
        } catch {
            toast.error("Please complete all fields.");
        }
    };

    const handleToPending = async (row) => {
        if (window.confirm(`Move back to leads - ${row.leadCode.toUpperCase()}?`)) {
            try {
                await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/pending/${row._id}`, {
                    agent: form.agent,
                });

                toast.success("Project marked as Cancelled!");
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

    useEffect(() => { fetchData(); }, [selectedCompany]);

    const columns = [
        { key: "in_design_date", accessorKey: 'in_design_date', header: 'Date', maxSize: 80 },
        { key: "leadCode", accessorKey: 'leadCode', header: 'Code', maxSize: 80 },
        { key: "service_type", accessorKey: 'service_type', header: 'Service Type' },
        { key: "project_type", accessorKey: 'project_type', header: 'Project Type' },
        { key: "designer", accessorKey: 'designer', header: 'Designer', maxSize: 80 },
        { key: "design_deadline", accessorKey: 'design_deadline', header: 'Deadline', maxSize: 80 },
        {
            key: "actions", header: 'Set Status', maxSize: 80,
            Cell: ({ row }) => (
                <div className='flex'>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleStatusClick(row.original); }}
                        className="text-gray-600 font-bold flex items-center cursor-pointer border-r-2 pr-2">
                        <span className="text-xs mr-1 text-center ">Submit</span>
                        <CheckCircleOutlineIcon fontSize="small" />
                    </button>

                    {
                        isAdminOrManagement && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleToPending(row.original); }}
                                className="text-red-400 font-bold flex items-center cursor-pointer ml-3">
                                <span className="text-xs mr-1 text-center ">Cancel</span>
                                <HighlightOffIcon fontSize="small" />
                            </button>
                        )
                    }

                    <button
                        onClick={(e) => { e.stopPropagation(); handleCommentClick(row.original); }}
                        className="ml-3 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-200 cursor-pointer"
                        title="Add Comment"
                    >
                        <span className="text-center">Comment</span>
                        <CommentIcon sx={{ fontSize: 15 }} />
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
                    <h1 className="font-bold text-sm md:text-lg text-white mr-2">Design Stage</h1>

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
                <DialogTitle><b>Move To Review</b></DialogTitle>

                <DialogContent>

                    <TextField
                        fullWidth
                        label="Design File Link"
                        size="small"
                        margin="normal"
                        value={form.design_file}
                        onChange={e => setForm({ ...form, design_file: e.target.value })}
                    />

                    <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        label="Previous Description"
                        value={selectedRow?.description || ""}
                        disabled
                        hidden
                        multiline
                        minRows={3}
                    />

                    {/* <TextField
                        fullWidth
                        label="Add Description"
                        size="small"
                        margin="normal"
                        multiline
                        minRows={4}
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                    /> */}

                    <RichTextEditor
                        value={form.description}
                        onChange={(html) =>
                            setForm(prev => ({ ...form, description: html }))
                        }
                    />
                </DialogContent>

                <small className='text-gray-600 mx-auto my-2'>All fields are required.</small>

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
        </Layout>
    );
}
