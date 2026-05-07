import { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import Layout from '../../../Layout';
import Datatable from '../../../Components/Datatable/Datatable';
import View from './View';
import axios from 'axios';
import CachedIcon from '@mui/icons-material/Cached';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CommentIcon from '@mui/icons-material/Comment';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import RichTextEditor from "../../../Components/RichTextEditor";
import 'react-toastify/dist/ReactToastify.css';
import { markEditedRowForHighlight } from '../../../utils/datatableState';
import LeadPaymentModal from '../../../Components/LeadPaymentModal';
import PaymentCell from '../../../Components/Datatable/PaymentCell';
import { formatCurrencyGBP, formatLondonDateTime } from '../../../utils/formatters';
import { ensureLeadDetail } from '../../../utils/leadDetails';


export default function In_Review() {
    document.title = 'In Review';

    const EndPoint = 'leads';
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdminOrManagement = currentUser?.userType === "Admin" || currentUser?.userType === "Management";

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
    const [selectedRow, setSelectedRow] = useState(null);
    const [form, setForm] = useState({ agent: "", description: "" });
    const [closePaymentForm, setClosePaymentForm] = useState({ paid_at: "", amount: "", discount_given: "", note: "" });
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [commentForm, setCommentForm] = useState({ agent: "", description: "" });
    const [stageModalOpen, setStageModalOpen] = useState(false);
    const [stageForm, setStageForm] = useState({
        stage: "",
        description: ""
    });
    const [stageErrors, setStageErrors] = useState({});
    const isRichTextEmpty = (html = "") => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim() === "";
    const parseMoney = (value) => {
        const numeric = Number(String(value ?? 0).replace(/[^0-9.-]/g, ""));
        return Number.isFinite(numeric) ? numeric : 0;
    };
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
                    status: "In_Review",
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
        const existingDue = parseMoney(fullRow?.payment_due_amount);

        setForm({
            agent: loggedUser?.name || "",
            description: ""
        });
        setClosePaymentForm({
            paid_at: "",
            amount: existingDue > 0 ? String(existingDue) : "",
            discount_given: "0",
            note: "Final due amount received while closing project."
        });

        setStatusModalOpen(true);
    };

    const handleStatusSubmit = async () => {
        const dueAmount = parseMoney(selectedRow?.payment_due_amount);
        const collectAmount = parseMoney(closePaymentForm.amount);
        const collectDiscount = parseMoney(closePaymentForm.discount_given);

        if (dueAmount > 0 && (collectAmount + collectDiscount !== dueAmount)) {
            toast.error(`Please settle full due amount (${formatCurrencyGBP(dueAmount)}) using receive amount and/or discount before closing.`);
            return;
        }

        try {
            if (dueAmount > 0) {
                await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/leads/payments/${selectedRow._id}`, {
                    amount: collectAmount,
                    discount_given: collectDiscount,
                    note: closePaymentForm.note,
                    paid_at: closePaymentForm.paid_at || undefined,
                    agent: form.agent || currentUser?.name || "System"
                });
            }

            await axios.patch(
                `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/closed/${selectedRow._id}`,
                {
                    agent: form.agent,
                    // description: selectedRow.description ? selectedRow.description + "\n" + form.description : form.description
                    // description: selectedRow.description ? selectedRow.description + "<br>" + form.description : form.description
                    description: form.description

                }
            );

            toast.success("Project closed");
            fetchData();
            setStatusModalOpen(false);
            setClosePaymentForm({ paid_at: "", amount: "", discount_given: "", note: "" });
        } catch {
            toast.error("Please complete all fields.");
        }
    };

    const handleBackToDrawingPhase = async (row) => {
        const fullRow = await loadLeadDetail(row);
        if (!fullRow) return;
        if (window.confirm(`Move back to Drawing Phase - ${fullRow.leadCode.toUpperCase()}?`)) {
            try {
                const loggedUser = JSON.parse(localStorage.getItem('user'));
                await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/in_design/${fullRow._id}`, {
                    agent: loggedUser?.name || "",
                    design_deadline: fullRow.design_deadline || "",
                    designer: fullRow.designer || "",
                    description: "Moved back from Under Review to Drawing Phase."
                });

                toast.success("Project moved back to Drawing Phase!");
                fetchData();
            } catch {
                toast.error("Failed to move back to Drawing Phase.");
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

    const renderClientWithCompany = (row) => {
        const clientName = row.client?.name || "N/A";
        const companyName = row.client?.company?.trim() ? row.client.company : null;
        const displayText = companyName ? `${clientName} (${companyName})` : clientName;

        return (
            <div className="max-w-60 min-w-0">
                <p className="truncate text-slate-700" title={displayText}>{displayText}</p>
                {(row.client?.phone || row.client?.email) && (
                    <p
                        className="truncate text-xs text-slate-500 cursor-copy"
                        title={`Click to copy: ${row.client?.phone && row.client?.email ? `${row.client.phone} (${row.client.email})` : (row.client?.phone || row.client?.email)}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard?.writeText(
                                row.client?.phone && row.client?.email
                                    ? `${row.client.phone} (${row.client.email})`
                                    : (row.client?.phone || row.client?.email || "")
                            );
                        }}
                    >
                        {row.client?.phone && row.client?.email ? `${row.client.phone} (${row.client.email})` : (row.client?.phone || row.client?.email)}
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
        { key: "in_review_date", accessorKey: 'in_review_date', header: 'Date', maxSize: 60 },
        { key: "leadCode", accessorKey: 'leadCode', header: 'Code', maxSize: 60 },
        { key: "client", header: 'Client', minSize: 220, maxSize: 260, Cell: ({ row }) => renderClientWithCompany(row.original) },
        { key: "project_type", accessorKey: 'project_type', header: 'Project Type' },
        { key: "address", header: 'Project Address', size: 220, minSize: 220, maxSize: 220, grow: false, muiTableBodyCellProps: { sx: { whiteSpace: 'normal !important', overflow: 'hidden' } }, Cell: ({ row }) => renderAddressCell(row.original) },
        { key: "designer", accessorKey: 'designer', header: 'Designer' },
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
                        className="text-emerald-600 font-bold flex items-center cursor-pointer border-r-2 pr-2">
                        <span className="text-xs mr-1 text-center ">Close</span>
                        <CheckCircleOutlineIcon fontSize="small" />
                    </button>


                    <button
                        onClick={(e) => { e.stopPropagation(); handleBackToDrawingPhase(row.original); }}
                        className="text-violet-600 font-bold flex items-center cursor-pointer ml-3">
                        <span className="text-xs mr-1 text-center ">Back to Drawing</span>
                        <DesignServicesIcon fontSize="small" />
                    </button>

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

    const paymentHistory = Array.isArray(selectedRow?.payment_history) ? selectedRow.payment_history : [];
    const dueAmount = parseMoney(selectedRow?.payment_due_amount);
    const receivedAmount = parseMoney(selectedRow?.payment_received_total);
    const collectAmount = parseMoney(closePaymentForm.amount);
    const collectDiscount = parseMoney(closePaymentForm.discount_given);
    const canCloseProject = dueAmount <= 0 || (collectAmount + collectDiscount === dueAmount);

    return (
        <Layout>
            <ToastContainer position="bottom-right" autoClose={2000} />

            <section className="leadPageShell">
                <div className="leadPageHeader">
                    <div className='leadPageHeaderLeft'>
                        <h1 className="leadPageTitle">Under Review</h1>

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
                <DialogTitle><b>Close Project</b></DialogTitle>

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
                    <div className='grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3 mt-2'>
                        <div><p className='text-xs text-slate-500'>Quoted</p><p className='font-semibold text-slate-800'>{formatCurrencyGBP(selectedRow?.quote_price || 0)}</p></div>
                        <div><p className='text-xs text-slate-500'>Received</p><p className='font-semibold text-emerald-700'>{formatCurrencyGBP(receivedAmount)}</p></div>
                        <div><p className='text-xs text-slate-500'>Due</p><p className='font-semibold text-red-600'>{formatCurrencyGBP(dueAmount)}</p></div>
                    </div>
                    <small className='block text-gray-600 mb-3'>Final due amount must be received before closing the project.</small>

                    <div className='rounded-lg border border-slate-200 mb-3'>
                        <div className='px-3 py-2 bg-slate-100 border-b border-slate-200'>
                            <p className='text-sm font-semibold text-slate-700'>Payment History</p>
                        </div>
                        <div className='max-h-44 overflow-y-auto'>
                            <table className='w-full text-sm'>
                                <thead className='bg-slate-50'>
                                    <tr>
                                        <th className='text-left px-3 py-2'>Date</th>
                                        <th className='text-left px-3 py-2'>Agent</th>
                                        <th className='text-left px-3 py-2'>Amount</th>
                                        <th className='text-left px-3 py-2'>Discount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentHistory.map((item) => (
                                        <tr key={item._id} className='border-t border-slate-200'>
                                            <td className='px-3 py-2'>{formatLondonDateTime(item?.paid_at)}</td>
                                            <td className='px-3 py-2'>{item?.agent || "-"}</td>
                                            <td className='px-3 py-2'>{formatCurrencyGBP(item?.paid_amount || 0)}</td>
                                            <td className='px-3 py-2'>{formatCurrencyGBP(item?.discount_given || 0)}</td>
                                        </tr>
                                    ))}
                                    {!paymentHistory.length && (
                                        <tr><td className='px-3 py-3 text-slate-500' colSpan={4}>No payment history found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {dueAmount > 0 && (
                        <>
                            <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
                                <TextField
                                    fullWidth
                                    type="date"
                                    size="small"
                                    margin="normal"
                                    label="Payment Date"
                                    InputLabelProps={{ shrink: true }}
                                    value={closePaymentForm.paid_at}
                                    onChange={e => setClosePaymentForm(prev => ({ ...prev, paid_at: e.target.value }))}
                                />
                                <TextField
                                    fullWidth
                                    type="number"
                                    size="small"
                                    margin="normal"
                                    label={`Receive Amount (${formatCurrencyGBP(dueAmount)})*`}
                                    value={closePaymentForm.amount}
                                    onChange={e => setClosePaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                                />
                                <TextField
                                    fullWidth
                                    type="number"
                                    size="small"
                                    margin="normal"
                                    label="Discount Given"
                                    value={closePaymentForm.discount_given}
                                    onChange={e => setClosePaymentForm(prev => ({ ...prev, discount_given: e.target.value }))}
                                />
                            </div>
                            <TextField
                                fullWidth
                                size="small"
                                margin="normal"
                                label="Payment Note"
                                multiline
                                minRows={2}
                                value={closePaymentForm.note}
                                onChange={e => setClosePaymentForm(prev => ({ ...prev, note: e.target.value }))}
                            />
                        </>
                    )}


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

                <DialogActions>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleStatusSubmit}
                        disabled={!canCloseProject}
                        className="bg-[#272e3f]! hover:bg-gray-700! font-bold!"
                        sx={{
                            '&.Mui-disabled': {
                                backgroundColor: '#94a3b8',
                                color: 'rgba(255, 255, 255, 0.4)'
                            }
                        }}
                    >
                        Collect Due & Close Project
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
                        <option value="Review Ongoing">Review Ongoing</option>
                        <option value="Changes Requested">Changes Requested</option>
                        <option value="Approved">Approved</option>
                        <option value="Final Invoice Sent">Final Invoice Sent</option>
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
