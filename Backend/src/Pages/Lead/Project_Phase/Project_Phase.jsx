import { useState, useEffect, useCallback } from 'react';
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
import { markEditedRowForHighlight } from '../../../utils/datatableState';
import LeadPaymentModal from '../../../Components/LeadPaymentModal';
import PaymentCell from '../../../Components/Datatable/PaymentCell';
import { ensureLeadDetail } from '../../../utils/leadDetails';


export default function Project_Phase() {
    document.title = 'Drawing Phase';


    const EndPoint = 'leads';

    const loggedUser = JSON.parse(localStorage.getItem("user"));

    const isAdminOrManagement = loggedUser?.userType === "Admin" || loggedUser?.userType === "Management";

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
    const [totalRows, setTotalRows] = useState(0);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentLead, setPaymentLead] = useState(null);

    const [selectedCompany, setSelectedCompany] = useState("All");
    const [companies, setCompanies] = useState([]);
    const [tableQuery, setTableQuery] = useState({ page: 1, limit: 10, search: "", sortBy: "", sortDir: "desc" });

    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [lostModalOpen, setLostModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [form, setForm] = useState({ agent: "", design_file: "", description: "" });
    const [lostForm, setLostForm] = useState({ agent: "", description: "" });
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [commentForm, setCommentForm] = useState({ agent: "", description: "" });
    const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
    const [stageModalOpen, setStageModalOpen] = useState(false);
    const [stageForm, setStageForm] = useState({
        stage: "",
        description: ""
    });
    const [stageErrors, setStageErrors] = useState({});
    const isRichTextEmpty = (html = "") => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim() === "";
    const loadLeadDetail = useCallback(async (row) => {
        try {
            return await ensureLeadDetail(row);
        } catch {
            toast.error("Failed to load lead details.");
            return null;
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`, {
                params: {
                    status: "In_Design",
                    company: selectedCompany === "All" ? "" : selectedCompany,
                    page: tableQuery.page,
                    limit: tableQuery.limit,
                    search: tableQuery.search,
                    sortBy: tableQuery.sortBy,
                    sortDir: tableQuery.sortDir,
                }
            });
            const payload = response.data;
            const rows = Array.isArray(payload) ? payload : (payload?.rows || []);
            setData(rows);
            setTotalRows(Array.isArray(payload) ? rows.length : Number(payload?.total || 0));
            if (Array.isArray(payload?.companies)) {
                setCompanies(payload.companies);
            } else {
                const uniqueCompanies = [...new Set(rows.map((item) => item.company))].filter(Boolean);
                setCompanies(uniqueCompanies);
            }
        } catch {
            toast.error('Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    }, [EndPoint, selectedCompany, tableQuery.limit, tableQuery.page, tableQuery.search, tableQuery.sortBy, tableQuery.sortDir]);

    const handleServerQueryChange = useCallback((nextQuery) => {
        setTableQuery((prev) => {
            const next = {
                ...prev,
                ...nextQuery,
                page: Math.max(1, Number(nextQuery?.page || prev.page || 1)),
                limit: Math.max(1, Number(nextQuery?.limit || prev.limit || 10)),
            };
            if (
                prev.page === next.page &&
                prev.limit === next.limit &&
                prev.search === next.search &&
                prev.sortBy === next.sortBy &&
                prev.sortDir === next.sortDir
            ) return prev;
            return next;
        });
    }, []);

    const handleStatusClick = async (row) => {
        const loggedUser = JSON.parse(localStorage.getItem('user'));
        const fullRow = await loadLeadDetail(row);
        if (!fullRow) return;
        setSelectedRow(fullRow);

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

    const handleLostClick = async (row) => {
        document.activeElement?.blur?.();
        const user = JSON.parse(localStorage.getItem("user"));
        const fullRow = await loadLeadDetail(row);
        if (!fullRow) return;
        setSelectedRow(fullRow);
        setLostForm({ agent: user?.name || "", description: "" });
        setLostModalOpen(true);
    };

    const handleLostSubmit = async () => {
        if (isRichTextEmpty(lostForm.description)) {
            toast.error("Description is required.");
            return;
        }

        try {
            await axios.patch(
                `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/lost_lead/${selectedRow._id}`,
                { ...lostForm, status: "Lost_Lead" }
            );
            toast.success("Lead moved to Lost Lead.");
            fetchData();
            setLostModalOpen(false);
        } catch {
            toast.error("Failed to mark as Lost.");
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

    const handleEdit = async (row) => {
        const fullRow = await loadLeadDetail(row);
        if (!fullRow) return;
        setEditData(fullRow);
        setModalOpen(true);
    };

    const handleView = async (row) => {
        const fullRow = await loadLeadDetail(row);
        if (!fullRow) return;
        setViewData(fullRow);
        setViewModalOpen(true);
    };
    const handlePaymentClick = async (row) => {
        const fullRow = await loadLeadDetail(row);
        if (!fullRow) return;
        setPaymentLead(fullRow);
        setPaymentModalOpen(true);
    };

    const handleCommentClick = async (row) => {
        document.activeElement?.blur?.();
        const user = JSON.parse(localStorage.getItem("user"));
        const fullRow = await loadLeadDetail(row);
        if (!fullRow) return;
        setSelectedRow(fullRow);
        setCommentForm({ agent: user?.name || "", description: "" });
        setCommentModalOpen(true);
    };

    const handleStageClick = async (row) => {
        document.activeElement?.blur?.();
        const fullRow = await loadLeadDetail(row);
        if (!fullRow) return;
        setSelectedRow(fullRow);
        setStageForm({
            stage: fullRow.stage || "",
            description: ""
        });
        setStageErrors({});
        setStageModalOpen(true);
    };

    const handleStageSubmit = async () => {
        const errors = {};
        if (!stageForm.stage) errors.stage = "Stage required";
        if (isRichTextEmpty(stageForm.description)) errors.description = "Description required";

        setStageErrors(errors);
        if (Object.keys(errors).length) return;

        const user = JSON.parse(localStorage.getItem("user"));
        try {
            await axios.patch(
                `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/${selectedRow._id}`,
                {
                    company: selectedRow.company,
                    client: selectedRow.client?._id || selectedRow.client,
                    source: selectedRow.source,
                    stage: stageForm.stage,
                    description: stageForm.description,
                    agent: user?.name
                }
            );

            markEditedRowForHighlight(selectedRow._id);
            toast.success("Stage updated");
            fetchData();
            setStageModalOpen(false);
        } catch {
            toast.error("Failed to update stage");
        }
    };

    const handleCommentSubmit = async () => {
        if (isCommentSubmitting) return;

        if (isRichTextEmpty(commentForm.description)) {
            toast.error("Description is required.");
            return;
        }

        setIsCommentSubmitting(true);
        try {
            await axios.patch(
                `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/comment/${selectedRow._id}`,
                commentForm
            );
            markEditedRowForHighlight(selectedRow._id);
            toast.success("Comment added successfully.");
            fetchData();
            setCommentModalOpen(false);
        } catch {
            toast.error("Failed to add comment.");
        } finally {
            setIsCommentSubmitting(false);
        }
    };

    useEffect(() => { fetchData(); }, [fetchData]);

    const renderAddressCell = (row) => {
        const address = row.address?.trim() || "N/A";
        return (
            <p
                className="block text-xs leading-4 text-slate-600"
                title={address}
                style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    wordBreak: "break-word",
                    width: "220px",
                    minWidth: "220px",
                    maxWidth: "220px",
                }}
            >
                {address}
            </p>
        );
    };

    const columns = [
        { key: "in_design_date", accessorKey: 'in_design_date', header: 'Date', maxSize: 60 },
        { key: "leadCode", accessorKey: 'leadCode', header: 'Code', maxSize: 60 },
        { key: "project_type", accessorKey: 'project_type', header: 'Project Type' },
        { key: "address", header: 'Project Address', size: 220, minSize: 220, maxSize: 220, grow: false, muiTableBodyCellProps: { sx: { whiteSpace: 'normal !important', overflow: 'hidden' } }, Cell: ({ row }) => renderAddressCell(row.original) },
        { key: "surveyor", accessorKey: 'surveyor', header: 'Surveyor', maxSize: 100 },
        { key: "survey_date", accessorKey: 'survey_date', header: 'Survey Date', maxSize: 100 },
        { key: "designer", accessorKey: 'designer', header: 'Designer', maxSize: 80 },
        { key: "design_deadline", accessorKey: 'design_deadline', header: 'Deadline', maxSize: 80 },
        {
            key: "payment",
            header: "Payment",
            maxSize: 130,
            Cell: ({ row }) => (
                <PaymentCell
                    lead={row.original}
                    onClick={handlePaymentClick}
                    showSummary={isAdminOrManagement}
                />
            )
        },
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
                    className="crmStageBtn cursor-pointer"
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
                <div className='crmSetStatusGroup inline-flex w-max items-center whitespace-nowrap'>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleStatusClick(row.original); }}
                        className="text-amber-600 font-bold flex items-center cursor-pointer border-r-2 pr-2">
                        <span className="text-xs mr-1 text-center ">Submit</span>
                        <CheckCircleOutlineIcon fontSize="small" />
                    </button>

                    {
                        isAdminOrManagement && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleLostClick(row.original); }}
                                className="text-rose-600 font-bold flex items-center cursor-pointer ml-3">
                                <span className="text-xs mr-1 text-center ">Lost</span>
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

            <section className="leadPageShell">
                <div className="leadPageHeader">
                    <div className='leadPageHeaderLeft'>
                        <h1 className="leadPageTitle">Design Stage</h1>

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

                        <span className="leadPageCount">
                            Total: {totalRows}
                        </span>
                    </div>

                    <div className='leadPageHeaderActions'>
                        <select
                            className="leadPageFilterSelect"
                            value={selectedCompany}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSelectedCompany(value);
                                setTableQuery((prev) => ({ ...prev, page: 1 }));
                            }}
                        >
                            <option value="All">All Companies</option>
                            {companies.map((company, index) => (
                                <option key={index} value={company}>{company}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="leadPageTableWrap">
                    <Datatable
                        columns={columns}
                        data={data}
                        onEdit={handleEdit}
                        onView={handleView}
                        onDelete={handleDelete}
                        permissions={userPermissions}
                        serverMode={true}
                        totalRows={totalRows}
                        isLoading={loading}
                        onServerQueryChange={handleServerQueryChange}
                    />
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
                <DialogTitle><b>Move To Review</b></DialogTitle>

                <DialogContent>
                    <div className="mb-3 flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                if (!selectedRow) return;
                                setStatusModalOpen(false);
                                handleCommentClick(selectedRow);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-700 transition-all duration-200 hover:border-slate-500 hover:bg-white hover:shadow-sm cursor-pointer"
                        >
                            <CommentIcon sx={{ fontSize: 16 }} />
                            Add Comment
                        </button>
                    </div>

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
                            setForm(prev => ({ ...prev, description: html }))
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
                open={lostModalOpen}
                onClose={() => setLostModalOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    <b>Mark as Lost</b>
                </DialogTitle>
                <DialogContent>
                    <div className="mb-3 flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                if (!selectedRow) return;
                                setLostModalOpen(false);
                                handleCommentClick(selectedRow);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-700 transition-all duration-200 hover:border-slate-500 hover:bg-white hover:shadow-sm cursor-pointer"
                        >
                            <CommentIcon sx={{ fontSize: 16 }} />
                            Add Comment
                        </button>
                    </div>
                    <RichTextEditor
                        value={lostForm.description}
                        onChange={(html) =>
                            setLostForm(prev => ({ ...prev, description: html }))
                        }
                    />

                    <div className='bg-gray-50 p-3 rounded-md border border-gray-300 mt-4'>
                        <h1 className='font-bold mb-2'>Previous Description</h1>
                        <div
                            className="text-gray-500 description-view"
                            dangerouslySetInnerHTML={{
                                __html: selectedRow?.description || "No description provided"
                            }}
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleLostSubmit}
                        className="bg-red-500! hover:bg-red-600! font-bold!"
                    >
                        Mark as Lost
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
                    <div className="mb-3 flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                if (!selectedRow) return;
                                setStageModalOpen(false);
                                handleCommentClick(selectedRow);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-700 transition-all duration-200 hover:border-slate-500 hover:bg-white hover:shadow-sm cursor-pointer"
                        >
                            <CommentIcon sx={{ fontSize: 16 }} />
                            Add Comment
                        </button>
                    </div>
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
                        <option value="First Draft Sent">First Draft Sent</option>
                        <option value="Revision Ongoing">Revision Ongoing</option>
                        <option value="Final Draft Ready">Final Draft Ready</option>
                        <option value="Submitted for Review">Submitted for Review</option>
                        <option value="Full Paid">Full Paid</option>
                        <option value="Hold">Hold</option>
                        <option value="Other">Other</option>
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
                        disabled={isCommentSubmitting}
                        className="bg-[#272e3f]! hover:bg-gray-700! font-bold!"
                    >
                        {isCommentSubmitting ? "Submitting..." : "Submit Comment"}
                    </Button>
                </DialogActions>
            </Dialog>
            <LeadPaymentModal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} lead={paymentLead} onUpdated={() => fetchData()} />
        </Layout>
    );
}
