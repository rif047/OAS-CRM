import { useState, useEffect, useRef, useCallback } from 'react';
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
import { markEditedRowForHighlight } from '../../../utils/datatableState';
import LeadPaymentModal from '../../../Components/LeadPaymentModal';
import PaymentCell from '../../../Components/Datatable/PaymentCell';
import { ensureLeadDetail } from '../../../utils/leadDetails';

export default function In_Survey() {
    document.title = 'In Survey';

    const EndPoint = 'leads';

    const loggedUser = JSON.parse(localStorage.getItem("user"));

    const isAdminOrManagement = loggedUser?.userType === "Admin" || loggedUser?.userType === "Management";

    const userPermissions = {
        canEdit: false,
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
    const [totalRows, setTotalRows] = useState(0);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentLead, setPaymentLead] = useState(null);

    const [selectedCompany, setSelectedCompany] = useState("All");
    const [companies, setCompanies] = useState([]);
    const [tableQuery, setTableQuery] = useState({ page: 1, limit: 10, search: "", sortBy: "", sortDir: "desc" });

    const [surveyModalOpen, setSurveyModalOpen] = useState(false);
    const [surveyForm, setSurveyForm] = useState({ agent: "", survey_note: "", survey_file: "", survey_done: "" });

    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [lostModalOpen, setLostModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [form, setForm] = useState({ agent: "", designer: "", design_deadline: "", description: "" });
    const [lostForm, setLostForm] = useState({ agent: "", description: "" });
    const [designers, setDesigners] = useState([]);
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [commentForm, setCommentForm] = useState({ agent: "", description: "" });
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

    const fetchUsers = async () => {
        if (!isAdminOrManagement) {
            setDesigners([]);
            return;
        }

        try {
            const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/users/options`);
            setDesigners(res.data.filter(user => user.userType === "Designer"));
        } catch {
            toast.error("Failed to fetch users");
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`, {
                params: {
                    status: "In_Survey",
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
            design_deadline: fullRow.design_deadline || "",
            designer: fullRow.designer || "",
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


    const handleSurveyClick = async (row) => {
        const loggedUser = JSON.parse(localStorage.getItem('user'));
        const fullRow = await loadLeadDetail(row);
        if (!fullRow) return;
        setSelectedRow(fullRow);

        setSurveyForm({
            agent: loggedUser?.name || "",
            survey_note: "",
            survey_file: fullRow.survey_file || "",
            survey_done: fullRow.survey_done || "No"
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
        if (isRichTextEmpty(commentForm.description)) {
            toast.error("Description is required.");
            return;
        }

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
        }
    };

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        if (isAdminOrManagement) {
            fetchUsers();
        } else {
            setDesigners([]);
        }
    }, [isAdminOrManagement]);

    const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const highlightMatch = (text, query) => {
        const source = String(text ?? "");
        const q = String(query ?? "").trim();
        if (!q) return source;
        const parts = source.split(new RegExp(`(${escapeRegex(q)})`, "ig"));
        return parts.map((part, idx) => (
            part.toLowerCase() === q.toLowerCase() ? <mark key={`${part}-${idx}`}>{part}</mark> : part
        ));
    };

    const renderClientWithCompany = (row) => {
        const clientName = row.client?.name || "N/A";
        const companyName = row.client?.company?.trim() ? row.client.company : null;
        const displayText = companyName ? `${clientName} (${companyName})` : clientName;
        const contactText = row.client?.phone && row.client?.email
            ? `${row.client.phone} (${row.client.email})`
            : (row.client?.phone || row.client?.email || "");

        return (
            <div className="max-w-60 min-w-0">
                <p className="truncate text-slate-700" title={displayText}>{highlightMatch(displayText, tableQuery.search)}</p>
                {(row.client?.phone || row.client?.email) && (
                    <p
                        className="truncate text-xs text-slate-500 cursor-copy"
                        title={`Click to copy: ${contactText}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard?.writeText(contactText);
                        }}
                    >
                        {highlightMatch(contactText, tableQuery.search)}
                    </p>
                )}
            </div>
        );
    };

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
        { key: "in_survey_date", accessorKey: 'in_survey_date', header: 'Date', maxSize: 60 },
        { key: "leadCode", accessorKey: 'leadCode', header: 'Code', maxSize: 60 },
        { key: "client", header: 'Client', minSize: 220, maxSize: 260, Cell: ({ row }) => renderClientWithCompany(row.original) },
        { key: "address", header: 'Project Address', size: 220, minSize: 220, maxSize: 220, grow: false, muiTableBodyCellProps: { sx: { whiteSpace: 'normal !important', overflow: 'hidden' } }, Cell: ({ row }) => renderAddressCell(row.original) },
        { key: "survey_date", accessorKey: 'survey_date', header: 'Survey Date' },
        { key: "survey_done", accessorKey: 'survey_done', header: 'Done', maxSize: 50 },
        ...(loggedUser?.userType !== "Surveyor" ? [
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
            }
        ] : []),
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
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSurveyClick(row.original);
                        }}
                        className="text-cyan-600 font-bold flex items-center cursor-pointer border-r-2 pr-2">
                        <span className="text-xs mr-1 text-center ">Survey Data</span>
                        <EventNoteIcon fontSize="small" />
                    </button>

                    {
                        isAdminOrManagement && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusClick(row.original); }}
                                    className="text-violet-600 font-bold flex items-center cursor-pointer border-r-2 px-2">
                                    <span className="text-xs mr-1 text-center ">Drawing</span>
                                    <DesignServicesIcon fontSize="small" />
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); handleLostClick(row.original); }}
                                    className="text-rose-600 font-bold flex items-center cursor-pointer ml-2">
                                    <span className="text-xs mr-1 text-center ">Lost</span>
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

            <section className="leadPageShell">
                <div className="leadPageHeader">
                    <div className='leadPageHeaderLeft'>
                        <h1 className="leadPageTitle">Under Survey</h1>

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
                <DialogTitle><b>Sent To Drawing Phase</b></DialogTitle>

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
                        <option value="">Select Architect*</option>
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
                    <div className="mb-3 flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                if (!selectedRow) return;
                                setSurveyModalOpen(false);
                                handleCommentClick(selectedRow);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-700 transition-all duration-200 hover:border-slate-500 hover:bg-white hover:shadow-sm cursor-pointer"
                        >
                            <CommentIcon sx={{ fontSize: 16 }} />
                            Add Comment
                        </button>
                    </div>
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
                open={lostModalOpen}
                onClose={() => setLostModalOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle><b>Mark as Lost</b></DialogTitle>
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
                        <option value="Survey Scheduled">Survey Scheduled</option>
                        <option value="Survey Completed">Survey Completed</option>
                        <option value="Survey Report Sent">Survey Report Sent</option>
                        <option value="Drawing Paid">Drawing Paid</option>
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
                        className="bg-[#272e3f]! hover:bg-gray-700! font-bold!"
                    >
                        Submit Comment
                    </Button>
                </DialogActions>
            </Dialog>
            <LeadPaymentModal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} lead={paymentLead} onUpdated={() => fetchData()} />

        </Layout>
    );
}
