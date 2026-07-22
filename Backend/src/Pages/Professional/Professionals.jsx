import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CachedIcon from '@mui/icons-material/Cached';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import NotesIcon from '@mui/icons-material/Notes';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import Layout from '../../Layout';
import Datatable from '../../Components/Datatable/Datatable';
import { formatLondonDate } from '../../utils/formatters';
import Add_Edit from './Add_Edit';
import View from './View';
import Notes from './Notes';
import { PROFESSIONAL_SECTORS } from './professionalOptions';

export default function Professionals() {
    document.title = 'Professionals';

    const EndPoint = 'professionals';
    const userType = localStorage.getItem('userType');
    const canDelete = userType === 'Admin';
    const canModify = userType === 'Admin' || userType === 'Management' || userType === 'Surveyor';

    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [notesModalOpen, setNotesModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [viewData, setViewData] = useState(null);
    const [notesData, setNotesData] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [convertingId, setConvertingId] = useState('');
    const [sectorFilter, setSectorFilter] = useState('All');
    const [sectorOptions, setSectorOptions] = useState(PROFESSIONAL_SECTORS);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = sectorFilter && sectorFilter !== 'All' ? { sector: sectorFilter } : {};
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`, { params });
            setData(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            toast.error('Failed to fetch data. Please try again.');
            console.error('Error fetching professionals:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMeta = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/meta`);
            const sectors = Array.isArray(response.data?.sectors) ? response.data.sectors : [];
            if (sectors.length) setSectorOptions(sectors);
        } catch {
            setSectorOptions(PROFESSIONAL_SECTORS);
        }
    };

    useEffect(() => {
        fetchMeta();
    }, []);

    useEffect(() => {
        fetchData();
    }, [sectorFilter]);

    const filterOptions = useMemo(() => {
        const sectorsFromData = data.map((item) => item.sector).filter(Boolean);
        return ['All', ...new Set([...sectorOptions, ...sectorsFromData])];
    }, [data, sectorOptions]);

    const handleAdd = () => {
        setEditData(null);
        setModalOpen(true);
    };

    const handleEdit = (row) => {
        setEditData(row);
        setModalOpen(true);
    };

    const handleView = (row) => {
        setViewData(row);
        setViewModalOpen(true);
    };

    const handleNotes = (row) => {
        setNotesData(row);
        setNotesModalOpen(true);
    };

    const handleMakeAsClient = async (row) => {
        if (row.is_client) {
            toast.info('This professional is already marked as client.');
            return;
        }

        if (!window.confirm(`Make ${row.name} as a client?`)) return;

        setConvertingId(row._id);
        try {
            const response = await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/${row._id}/make-client`);
            toast.success(response.data?.message || 'Client created successfully.');
            fetchData();
        } catch (error) {
            const message = typeof error?.response?.data === 'string'
                ? error.response.data
                : error?.response?.data?.error;
            toast.error(message || 'Failed to make client. Please try again.');
        } finally {
            setConvertingId('');
        }
    };

    const handleDelete = async (row) => {
        if (window.confirm(`Are you sure you want to delete ${String(row.name || '').toUpperCase()}?`)) {
            try {
                await axios.delete(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/${row._id}`);
                toast.success(`${String(row.name || '').toUpperCase()} deleted.`);
                fetchData();
            } catch (error) {
                toast.error('Failed to delete. Please try again.');
                console.error('Error deleting professional:', error);
            }
        }
    };

    const columns = [
        { key: 'createdAt', accessorFn: (row) => formatLondonDate(row.createdAt, ''), header: 'Date', maxSize: 60 },
        { accessorKey: 'sector', header: 'Sector' },
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'phone', header: 'Contact Number', enableClickToCopy: true },
        { accessorKey: 'company', header: 'Companies' },
        { accessorKey: 'email', header: 'Email', enableClickToCopy: true },
        {
            id: 'actions',
            header: 'Actions',
            size: 220,
            minSize: 220,
            maxSize: 260,
            grow: false,
            muiTableHeadCellProps: { align: 'center', sx: { px: 0 } },
            muiTableBodyCellProps: {
                align: 'center',
                sx: {
                    px: 0,
                    '& > div': {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                    },
                },
            },
            Cell: ({ row }) => (
                <div className="tableActionGroup">
                    <button
                        className="actionBtn actionBtnView"
                        title="View"
                        onClick={(event) => {
                            event.stopPropagation();
                            handleView(row.original);
                        }}
                    >
                        <VisibilityIcon />
                    </button>

                    {canModify && (
                        <button
                            className="actionBtn actionBtnEdit"
                            title="Edit"
                            onClick={(event) => {
                                event.stopPropagation();
                                handleEdit(row.original);
                            }}
                        >
                            <EditIcon />
                        </button>
                    )}

                    {canModify && (
                        <button
                            className="actionBtn actionBtnNote"
                            title="Notes"
                            onClick={(event) => {
                                event.stopPropagation();
                                handleNotes(row.original);
                            }}
                        >
                            <NotesIcon />
                        </button>
                    )}

                    {canModify && (
                        <button
                            className="actionBtn actionBtnClient"
                            title={row.original.is_client ? 'Already client' : 'Make as client'}
                            disabled={row.original.is_client || convertingId === row.original._id}
                            onClick={(event) => {
                                event.stopPropagation();
                                handleMakeAsClient(row.original);
                            }}
                        >
                            <PersonAddAlt1Icon />
                        </button>
                    )}

                    {canDelete && (
                        <button
                            className="actionBtn actionBtnDelete"
                            title="Delete"
                            onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(row.original);
                            }}
                        >
                            <DeleteIcon />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <Layout>
            <ToastContainer position="bottom-right" autoClose={2000} />

            <section className="leadPageShell">
                <div className="leadPageHeader">
                    <div className="leadPageHeaderLeft">
                        <h1 className="leadPageTitle">Professionals</h1>

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

                        <span className="leadPageCount">Total: {data.length}</span>
                    </div>

                    <div className="leadPageHeaderActions">
                        <select
                            value={sectorFilter}
                            className="leadPageFilterSelect"
                            onChange={(event) => setSectorFilter(event.target.value)}
                        >
                            {filterOptions.map((sector) => (
                                <option key={sector} value={sector}>{sector}</option>
                            ))}
                        </select>

                        {canModify && (
                            <button onClick={handleAdd} className="leadPagePrimaryBtn">
                                Add +
                            </button>
                        )}
                    </div>
                </div>

                <div className="leadPageTableWrap">
                    <Datatable
                        columns={columns}
                        data={data}
                        permissions={{ canView: false, canEdit: false, canDelete: false }}
                        isLoading={loading}
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

            {notesModalOpen && (
                <Notes
                    open={notesModalOpen}
                    onClose={() => setNotesModalOpen(false)}
                    data={notesData}
                    refreshData={fetchData}
                />
            )}
        </Layout>
    );
}
