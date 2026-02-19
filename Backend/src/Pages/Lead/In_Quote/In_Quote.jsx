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
import CommentIcon from '@mui/icons-material/Comment';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import RichTextEditor from "../../../Components/RichTextEditor";
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
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [commentForm, setCommentForm] = useState({ agent: "", description: "" });

    const [surveyors, setSurveyors] = useState([]);
    const [designers, setDesigners] = useState([]);

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/users`);

            setSurveyors(res.data.filter(user => user.userType === "Surveyor"));
            setDesigners(res.data.filter(user => user.userType === "Designer"));
        } catch {
            toast.error("Failed to fetch users");
        }
    };






    const [stageModalOpen, setStageModalOpen] = useState(false);
    const [stageForm, setStageForm] = useState({
        stage: "",
        description: ""
    });
    const [stageErrors, setStageErrors] = useState({});
    const isRichTextEmpty = (html = "") => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim() === "";
    const handleStageClick = (row) => {
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
                params: { status: "In_Quote" }
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
        if (!projectRemark) {
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
                    // description: selectedRow.description ? selectedRow.description + "\n" + projectRemark : projectRemark
                    description: projectRemark
                }
            );

            toast.success("Project moved to Drawing Phase!");
            fetchData();
            setDrawingModalOpen(false);
        } catch {
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
            } catch {
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
        { key: "quote_price", header: "Quoted P.", accessorFn: row => `£${row.quote_price || 0}`, maxSize: 80 },
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
                    className="px-3 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
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
                <div className='inline-flex w-max items-center whitespace-nowrap'>
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
                        title="Move to Drawing Phase"
                    >
                        <span className="text-xs mr-1 text-center">Drawing Phase</span>
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

            <section className="overflow-hidden rounded-xl border border-[#F0F0F0] bg-white shadow-sm">
                <div className="flex flex-col gap-3 bg-[#4c5165] px-4 py-3 md:flex-row md:items-center md:justify-between">
                    <div className='flex items-center gap-2 text-white'>
                        <h1 className="text-lg font-bold">Under Quote</h1>

                        {loading ? (
                            <div className="flex items-center justify-center text-white">
                                <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
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
                    </div>
                </div>

                <div className="p-3 md:p-4">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <svg className="h-20 w-20 animate-spin p-4 text-gray-700" viewBox="0 0 24 24" fill="none">
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


                    {/* <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        label="Surveyor*"
                        value={form.surveyor}
                        onChange={e => setForm({ ...form, surveyor: e.target.value })}
                    /> */}

                    <TextField
                        select
                        fullWidth
                        size="small"
                        margin="normal"
                        SelectProps={{ native: true }}
                        value={form.surveyor}
                        onChange={e => setForm({ ...form, surveyor: e.target.value })}
                    >
                        <option value="">Select Surveyor*</option>
                        {surveyors.map((s, index) => (
                            <option key={index} value={s.name}>
                                {s.name} - {s.phone}
                            </option>
                        ))}
                    </TextField>



                    <RichTextEditor
                        value={form.description}
                        onChange={html => setForm({ ...form, description: html })}
                    />



                    <div className='bg-gray-50 p-3 rounded-md border border-gray-400 mt-4'>
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
                    <Button fullWidth variant="contained" onClick={handleStatusSubmit} className="bg-[#272e3f]! hover:bg-gray-700! font-bold!"> Submit </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={drawingModalOpen} onClose={() => setDrawingModalOpen(false)} fullWidth maxWidth='sm'>
                <DialogTitle>
                    <b>Move to Drawing Phase - {selectedRow?.leadCode?.toUpperCase()}</b>
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


                    {/* <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        label="Designer*"
                        value={form.designer}
                        onChange={e => setForm({ ...form, designer: e.target.value })}
                    /> */}


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





                    <RichTextEditor
                        value={projectRemark}
                        onChange={html => setProjectRemark(html)}
                    />




                    <div className='bg-gray-50 p-3 rounded-md border border-gray-400 mt-4'>
                        <h1 className='font-bold mb-2'>Previous Description</h1>
                        <div
                            className="text-gray-500 description-view"
                            dangerouslySetInnerHTML={{
                                __html: selectedRow?.description || "No description provided"
                            }}
                        />
                    </div>
                </DialogContent>

                <small className='text-gray-600 mx-auto my-2'>Description is required.</small>

                <DialogActions>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleDrawingSubmit}
                        className="bg-[#272e3f]! hover:bg-gray-700! font-bold!"
                    >
                        Move to Drawing Phase
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
                        <option value="Quote Accepted">Quote Accepted</option>
                        <option value="Invoice Sent">Invoice Sent</option>
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
