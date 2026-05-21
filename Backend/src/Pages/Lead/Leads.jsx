import { useState, useEffect, useCallback } from 'react';
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
import LeadPaymentModal from '../../Components/LeadPaymentModal';
import { formatLondonDate } from "../../utils/formatters";
import { markEditedRowForHighlight } from '../../utils/datatableState';
import { ensureLeadDetail } from '../../utils/leadDetails';

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
    const [totalRows, setTotalRows] = useState(0);

    const [selectedCompany, setSelectedCompany] = useState("All");
    const [companies, setCompanies] = useState([]);
    const [tableQuery, setTableQuery] = useState({ page: 1, limit: 10, search: "", sortBy: "", sortDir: "desc" });

    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("");
    const [selectedRow, setSelectedRow] = useState(null);
    const [form, setForm] = useState({ agent: "", quote_price: "", quote_file: "", description: "", initial_payment: "", discount_given: "", payment_note: "" });
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentLead, setPaymentLead] = useState(null);
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









    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`, {
                params: {
                    status: "Pending",
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

    useEffect(() => { fetchData(); }, [fetchData]);

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
        document.activeElement?.blur?.();
        const user = JSON.parse(localStorage.getItem("user"));
        const fullRow = await loadLeadDetail(row);
        if (!fullRow) return;
        setSelectedRow(fullRow);
        setForm({ agent: user?.name || "", quote_price: "", quote_file: "", description: "", initial_payment: "", discount_given: "", payment_note: "" });
        setSelectedStatus("In_Quote");
        setStatusModalOpen(true);
    };

    const handleCancelled = async (row) => {
        document.activeElement?.blur?.();
        const user = JSON.parse(localStorage.getItem("user"));
        const fullRow = await loadLeadDetail(row);
        if (!fullRow) return;
        setSelectedRow(fullRow);
        setForm({ agent: user?.name || "", description: "" });
        setSelectedStatus("Lost_Lead");
        setStatusModalOpen(true);
    };

    const handleStatusSubmit = async () => {
        try {
            if (selectedStatus !== "Lost_Lead") {
                const quoted = Number(form.quote_price || 0);
                const paid = Number(form.initial_payment || 0);
                const discount = Number(form.discount_given || 0);
                if ((paid + discount) > quoted) {
                    toast.error("Initial payment + discount cannot exceed the quoted price.");
                    return;
                }
            }
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
    const q = Number(form.quote_price || 0);
    const p = Number(form.initial_payment || 0);
    const d = Number(form.discount_given || 0);
    const due = Math.max(q - (p + d), 0);

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
    const handleEdit = async (row) => {
        document.activeElement?.blur?.();
        const fullRow = await loadLeadDetail(row);
        if (!fullRow) return;
        setEditData(fullRow);
        setModalOpen(true);
    };
    const handleView = async (row) => {
        document.activeElement?.blur?.();
        const fullRow = await loadLeadDetail(row);
        if (!fullRow) return;
        setViewData(fullRow);
        setViewModalOpen(true);
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
        { key: "createdAt", accessorFn: (row) => formatLondonDate(row.createdAt, ''), header: 'Date', maxSize: 70 },
        { key: "leadCode", accessorKey: 'leadCode', header: 'Code', maxSize: 70 },
        { key: "client", header: 'Client', minSize: 220, maxSize: 260, Cell: ({ row }) => renderClientWithCompany(row.original) },
        { key: "project_type", accessorKey: 'project_type', header: 'Project Type' },
        { key: "address", header: 'Project Address', size: 220, minSize: 220, maxSize: 220, grow: false, muiTableBodyCellProps: { sx: { whiteSpace: 'normal !important', overflow: 'hidden' } }, Cell: ({ row }) => renderAddressCell(row.original) },
        {
            key: "stage",
            header: "Stage",
            maxSize: 80,
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
                <div className='crmSetStatusGroup inline-flex w-max items-center gap-2 whitespace-nowrap'>
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

            <section className="leadPageShell">
                <div className="leadPageHeader">
                    <div className='leadPageHeaderLeft'>
                        <h1 className="leadPageTitle">Project Leads</h1>
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

                        <button
                            onClick={handleAdd}
                            className="leadPagePrimaryBtn">
                            Create +
                        </button>
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
                <DialogTitle>
                    <b>{selectedStatus === "Lost_Lead" ? "Mark as Lost" : "Sent Quote"}</b>
                </DialogTitle>
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
                    {selectedStatus === "Lost_Lead" ? (
                        <>
                            <RichTextEditor
                                value={form.description}
                                onChange={(html) =>
                                    setForm(prev => ({ ...prev, description: html }))
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
                        </>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <TextField fullWidth label="Initial Payment" size="small" margin="normal" type='number' value={form.initial_payment} onChange={e => setForm({ ...form, initial_payment: e.target.value })} />
                                <TextField fullWidth label="Discount Given" size="small" margin="normal" type='number' value={form.discount_given} onChange={e => setForm({ ...form, discount_given: e.target.value })} />
                            </div>
                            <TextField fullWidth label="Payment Note" size="small" margin="normal" value={form.payment_note} onChange={e => setForm({ ...form, payment_note: e.target.value })} />
                            <div className="rounded-md border border-slate-300 bg-slate-50 p-2 text-sm text-slate-700 mb-2">
                                Due Amount: <b>{Number.isFinite(due) ? due : 0}</b>
                            </div>

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
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleStatusSubmit}
                        className={selectedStatus === "Lost_Lead" ? "bg-red-500! hover:bg-red-600! font-bold!" : "bg-[#272e3f]! hover:bg-gray-700! font-bold!"}
                    >
                        {selectedStatus === "Lost_Lead" ? "Mark as Lost" : "Submit"}
                    </Button>
                </DialogActions>
            </Dialog>
            <LeadPaymentModal
                open={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                lead={paymentLead}
                onUpdated={() => fetchData()}
            />

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
                        <option value="Not Interested">Not Interested</option>
                        <option value="Decision Pending">Decision Pending</option>
                        <option value="Survey Paid">Survey Paid</option>
                        <option value="Drawing Paid">Drawing Paid</option>
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

        </Layout>
    );
}
