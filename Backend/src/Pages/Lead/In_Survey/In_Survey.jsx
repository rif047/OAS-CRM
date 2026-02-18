import { useState, useEffect, useRef } from 'react';
import Layout from '../../../Layout';
import Datatable from '../../../Components/Datatable/Datatable';
import View from './View';
import Add_Edit from './Add_Edit';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CachedIcon from '@mui/icons-material/Cached';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import EventNoteIcon from '@mui/icons-material/EventNote';
import CommentIcon from '@mui/icons-material/Comment';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import RichTextEditor from "../../../Components/RichTextEditor";

export default function In_Survey() {
    document.title = 'In Survey';

    const EndPoint = 'leads';

    const loggedUser = JSON.parse(localStorage.getItem("user"));

    const isAdminOrManagement = loggedUser?.userType === "Admin" || loggedUser?.userType === "Management";

    const userPermissions = {
        canEdit: isAdminOrManagement,
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

    const [surveyModalOpen, setSurveyModalOpen] = useState(false);
    const [surveyForm, setSurveyForm] = useState({ agent: "", survey_note: "", survey_file: "", survey_done: "" });

    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [form, setForm] = useState({ agent: "", designer: "", design_deadline: "", description: "" });
    const [designers, setDesigners] = useState([]);
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [commentForm, setCommentForm] = useState({ agent: "", description: "" });
    const isRichTextEmpty = (html = "") => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim() === "";

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/users`);
            setDesigners(res.data.filter(user => user.userType === "Designer"));
        } catch {
            toast.error("Failed to fetch users");
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`);
            const filteredData = response.data.filter(item => item.status === "In_Survey");

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
            design_deadline: row.design_deadline || "",
            designer: row.designer || "",
            description: ""
        });

        setStatusModalOpen(true);
    };

    const handleStatusSubmit = async () => {
        try {
            await axios.patch(
                `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/in_design/${selectedRow._id}`,
                {
                    agent: form.agent,
                    design_deadline: form.design_deadline,
                    designer: form.designer,
                    // description: selectedRow.description ? selectedRow.description + "\n" + form.description : form.description
                    description: form.description
                }
            );

            toast.success("Project moved to next step!");
            fetchData();
            setStatusModalOpen(false);
        } catch {
            toast.error("Please complete all fields.");
        }
    };


    const handleSurveyClick = (row) => {
        const loggedUser = JSON.parse(localStorage.getItem('user'));

        setSelectedRow(row);

        setSurveyForm({
            agent: loggedUser?.name || "",
            survey_note: "",
            survey_file: row.survey_file || "",
            survey_done: row.survey_done || "No"
        });

        setSurveyModalOpen(true);
    };


    const handleSurveySubmit = async () => {
        try {
            await axios.patch(
                `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/survey_data/${selectedRow._id}`,
                {
                    agent: surveyForm.agent,
                    survey_note: surveyForm.survey_note,
                    survey_file: surveyForm.survey_file,
                    survey_done: surveyForm.survey_done
                }
            );

            toast.success("Survey Data Updated!");
            setSurveyModalOpen(false);
            fetchData();

        } catch {
            toast.error("Failed to update survey data!");
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

    useEffect(() => {
        fetchData();
        fetchUsers();
    }, [selectedCompany]);

    const columns = [
        { key: "in_quote_date", accessorKey: 'in_quote_date', header: 'Date', maxSize: 80 },
        { key: "leadCode", accessorKey: 'leadCode', header: 'Code', maxSize: 80 },
        { accessorFn: row => row.client?.phone ? `${row.client?.name || "N/A"} (${row.client.phone})` : (row.client?.name || "N/A"), header: 'Client' },
        { key: "project_type", accessorKey: 'project_type', header: 'Project Type' },
        { key: "survey_date", accessorKey: 'survey_date', header: 'Survey Date' },
        { key: "survey_done", accessorKey: 'survey_done', header: 'Done', maxSize: 50 },
        {
            key: "actions", header: 'Set Status', maxSize: 80,
            Cell: ({ row }) => (
                <div className='flex'>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSurveyClick(row.original);
                        }}
                        className="text-indigo-500 font-bold flex items-center cursor-pointer border-r-2 pr-2">
                        <span className="text-xs mr-1 text-center ">Survey Data</span>
                        <EventNoteIcon fontSize="small" />
                    </button>

                    {
                        isAdminOrManagement && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusClick(row.original); }}
                                    className="text-gray-600 font-bold flex items-center cursor-pointer border-r-2 px-2">
                                    <span className="text-xs mr-1 text-center ">Drawing Phase</span>
                                    <DesignServicesIcon fontSize="small" />
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); handleToPending(row.original); }}
                                    className="text-red-400 font-bold flex items-center cursor-pointer ml-2">
                                    <span className="text-xs mr-1 text-center ">Cancel</span>
                                    <HighlightOffIcon fontSize="small" />
                                </button>
                            </>
                        )
                    }

                    <button
                        onClick={(e) => { e.stopPropagation(); handleCommentClick(row.original); }}
                        className="ml-2 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-200 cursor-pointer"
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
                    <h1 className="font-bold text-sm md:text-lg text-white mr-2">Under Survey</h1>

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
                <DialogTitle><b>Sent To Drawing Phase</b></DialogTitle>

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
                        select
                        fullWidth
                        size="small"
                        margin="normal"
                        SelectProps={{ native: true }}
                        value={form.designer}
                        onChange={e => setForm({ ...form, designer: e.target.value })}
                    >
                        <option value="">Select Designer*</option>
                        {designers.map((d, index) => (
                            <option key={index} value={d.name}>
                                {d.name} - {d.phone}
                            </option>
                        ))}
                    </TextField>


                    {/* <TextField
                        fullWidth
                        label="Description"
                        size="small"
                        margin="normal"
                        multiline
                        minRows={4}
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                    /> */}

                    <RichTextEditor
                        value={form.description}
                        onChange={html => setForm(prev => ({ ...prev, description: html }))}
                    />



                    <div className='bg-gray-50 p-4 rounded-lg'>
                        <h1 className='font-bold mb-2'>Previous Description</h1>
                        <div
                            className="text-gray-500 description-view"
                            dangerouslySetInnerHTML={{
                                __html: selectedRow?.description || "No description provided"
                            }}
                        />
                    </div>
                </DialogContent>

                <small className='text-gray-600 mx-auto my-2'>All fields are required.</small>

                <DialogActions>
                    <Button fullWidth variant="contained" onClick={handleStatusSubmit} className="bg-[#272e3f]! hover:bg-gray-700! font-bold!">
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>


            <Dialog open={surveyModalOpen} onClose={() => setSurveyModalOpen(false)} fullWidth maxWidth='sm'>
                <DialogTitle><b>Survey Data Update</b></DialogTitle>

                <DialogContent>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Survey Done *</label>
                    <select
                        value={surveyForm.survey_done}
                        onChange={e => setSurveyForm({ ...surveyForm, survey_done: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded text-sm mb-3"
                    >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                    </select>


                    <TextField
                        fullWidth
                        label="Survey Drive File URL"
                        size="small"
                        margin="normal"
                        multiline
                        value={surveyForm.survey_file}
                        onChange={e => setSurveyForm({ ...surveyForm, survey_file: e.target.value })}
                    />

                    {/* <TextField
                        fullWidth
                        label="Survey Note"
                        size="small"
                        margin="normal"
                        multiline
                        minRows={4}
                        value={surveyForm.survey_note}
                        onChange={e => setSurveyForm({ ...surveyForm, survey_note: e.target.value })}
                    /> */}

                    <RichTextEditor
                        value={surveyForm.survey_note}
                        onChange={(html) =>
                            setSurveyForm(prev => ({ ...prev, survey_note: html }))
                        }
                    />


                </DialogContent>

                <DialogActions>
                    <Button fullWidth variant="contained" onClick={handleSurveySubmit} className="bg-[#272e3f]! hover:bg-gray-700! font-bold!">
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
