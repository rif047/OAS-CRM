import { useEffect, useState } from 'react';
import { MaterialReactTable } from 'material-react-table';
import { Button } from '@mui/material';
import { mkConfig, generateCsv, download } from 'export-to-csv';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IosShareTwoToneIcon from '@mui/icons-material/IosShareTwoTone';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useLocation } from 'react-router-dom';
import { DATATABLE_EDIT_HIGHLIGHT_KEY, DATATABLE_HIGHLIGHT_EVENT } from '../../utils/datatableState';
import './MUI.css';

export default function Datatable({ columns, data, onEdit, onView, onDelete, permissions, defaultPageSize = 10, forceDefaultPageSize = false }) {
    const location = useLocation();
    const routeKey = location.pathname || 'default';
    const paginationStorageKey = `crm_datatable_pagination_${routeKey}`;
    const editedRowStorageKey = DATATABLE_EDIT_HIGHLIGHT_KEY;

    const getStoredPagination = () => {
        try {
            const raw = localStorage.getItem(paginationStorageKey);
            if (!raw) return { pageIndex: 0, pageSize: defaultPageSize };
            const parsed = JSON.parse(raw);
            return {
                pageIndex: Number.isInteger(parsed?.pageIndex) && parsed.pageIndex >= 0 ? parsed.pageIndex : 0,
                pageSize: Number.isInteger(parsed?.pageSize) && parsed.pageSize > 0 ? parsed.pageSize : defaultPageSize,
            };
        } catch {
            return { pageIndex: 0, pageSize: defaultPageSize };
        }
    };

    const [pagination, setPagination] = useState(getStoredPagination);
    const [highlightedRowId, setHighlightedRowId] = useState(null);
    const [copiedCodeKey, setCopiedCodeKey] = useState('');

    const excludedFields = ['_id', 'secret_code', 'password', '__v', 'images'];
    const centeredColumns = new Set(['stage', 'setstatus', 'set_status', 'actions', 'payment']);
    const zeroHorizontalPaddingColumns = new Set(['date', 'code', 'payment', 'stage', 'set_status', 'setstatus', 'actions']);

    const userType = localStorage.getItem("userType");
    const hasActionPermissions = Boolean(permissions?.canView || permissions?.canEdit || permissions?.canDelete);

    useEffect(() => {
        localStorage.setItem(paginationStorageKey, JSON.stringify(pagination));
    }, [pagination, paginationStorageKey]);

    useEffect(() => {
        if (!forceDefaultPageSize) return;
        setPagination((prev) => {
            if (prev.pageSize === defaultPageSize && prev.pageIndex === 0) return prev;
            return { pageIndex: 0, pageSize: defaultPageSize };
        });
    }, [defaultPageSize, forceDefaultPageSize, routeKey]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(data.length / pagination.pageSize));
        const maxPageIndex = totalPages - 1;

        if (pagination.pageIndex > maxPageIndex) {
            setPagination((prev) => ({ ...prev, pageIndex: maxPageIndex }));
        }
    }, [data.length, pagination.pageIndex, pagination.pageSize]);

    useEffect(() => {
        const raw = sessionStorage.getItem(editedRowStorageKey);
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw);
            const isSameRoute = parsed?.routeKey === routeKey;
            const notExpired = Number(parsed?.expiresAt) > Date.now();

            if (!isSameRoute || !notExpired || !parsed?.rowId) {
                sessionStorage.removeItem(editedRowStorageKey);
                return;
            }

            setHighlightedRowId(parsed.rowId);

            const timeoutMs = Math.max(0, parsed.expiresAt - Date.now());
            const timeoutId = setTimeout(() => {
                setHighlightedRowId(null);
                sessionStorage.removeItem(editedRowStorageKey);
            }, timeoutMs);

            return () => clearTimeout(timeoutId);
        } catch {
            sessionStorage.removeItem(editedRowStorageKey);
        }
    }, [routeKey, data]);

    useEffect(() => {
        const handleHighlightEvent = (event) => {
            const payload = event?.detail;
            if (!payload?.rowId) return;
            if (payload.routeKey !== routeKey) return;
            if (Number(payload.expiresAt) <= Date.now()) return;

            setHighlightedRowId(payload.rowId);
        };

        window.addEventListener(DATATABLE_HIGHLIGHT_EVENT, handleHighlightEvent);
        return () => {
            window.removeEventListener(DATATABLE_HIGHLIGHT_EVENT, handleHighlightEvent);
        };
    }, [routeKey]);


    const handleExportCsv = () => {
        const filteredData = data.map(row => {
            const filteredRow = { ...row };
            excludedFields.forEach(field => delete filteredRow[field]);

            for (const key in filteredRow) {
                const item = filteredRow[key];
                if (item?.name) {
                    filteredRow[key] = item.name;
                }
            }

            return filteredRow;
        });

        const csvConfig = mkConfig({
            fieldSeparator: ',',
            decimalSeparator: '.',
            useKeysAsHeaders: true,
        });

        const csv = generateCsv(csvConfig)(filteredData);
        download(csvConfig)(csv);
    };

    const handleCopyText = async (event, value) => {
        event.stopPropagation();
        const text = String(value || '').trim();
        if (!text) return;
        try {
            await navigator.clipboard?.writeText(text);
            setCopiedCodeKey(text);
            setTimeout(() => setCopiedCodeKey((prev) => (prev === text ? '' : prev)), 1200);
        } catch {
            // no-op: copy not supported
        }
    };


    const normalizedColumns = columns.map((column) => {
        const normalizedId = String(
            column.id || column.key || column.accessorKey || column.header || ''
        ).toLowerCase().replace(/\s+/g, '_');
        const plainId = normalizedId.replace(/_/g, '');
        const headerText = String(column.header || '').toLowerCase().trim();
        const isSetStatus = normalizedId === 'set_status' || plainId === 'setstatus';
        const isPriceColumn = normalizedId.includes('price') || plainId.includes('price');
        const isCodeColumn = normalizedId === 'code' || normalizedId === 'leadcode' || plainId === 'code' || plainId === 'leadcode';
        const isDateColumn =
            headerText === 'date' ||
            headerText.endsWith(' date') ||
            normalizedId.endsWith('_date') ||
            plainId.endsWith('date');
        const shouldCenter =
            centeredColumns.has(normalizedId) ||
            centeredColumns.has(plainId) ||
            isCodeColumn ||
            isDateColumn;
        const shouldZeroHorizontalPadding = zeroHorizontalPaddingColumns.has(normalizedId) || zeroHorizontalPaddingColumns.has(plainId);

        if (!shouldCenter && !isPriceColumn && !shouldZeroHorizontalPadding && !isCodeColumn) return column;

        return {
            ...column,
            ...(isCodeColumn && !column.Cell ? {
                Cell: ({ cell, renderedCellValue }) => {
                    const value = cell.getValue?.() ?? renderedCellValue ?? '';
                    const displayValue = String(value || '-');
                    const isCopied = copiedCodeKey && copiedCodeKey === displayValue;
                    return (
                        <button
                            type="button"
                            onClick={(e) => handleCopyText(e, value)}
                            title={isCopied ? 'Copied' : `Click to copy: ${displayValue}`}
                            className={`cursor-copy bg-transparent border-0 p-0 text-inherit font-inherit ${isCopied ? 'text-emerald-600' : ''}`}
                        >
                            {displayValue}
                        </button>
                    );
                },
            } : {}),
            muiTableHeadCellProps: {
                ...column.muiTableHeadCellProps,
                align: 'center',
                sx: {
                    ...(column.muiTableHeadCellProps?.sx || {}),
                    ...(isSetStatus ? { width: '1%', whiteSpace: 'nowrap', px: '4px' } : {}),
                    ...(shouldZeroHorizontalPadding ? { px: 0 } : {}),
                },
            },
            muiTableBodyCellProps: {
                ...column.muiTableBodyCellProps,
                ...(shouldCenter ? { align: 'center' } : {}),
                sx: {
                    ...(column.muiTableBodyCellProps?.sx || {}),
                    ...(isPriceColumn ? { fontWeight: 700, color: '#1f2937' } : {}),
                    ...(isSetStatus ? { width: '1%', whiteSpace: 'nowrap', px: '4px' } : {}),
                    ...(shouldZeroHorizontalPadding ? { px: 0 } : {}),
                    '& > div': {
                        ...(shouldCenter ? { justifyContent: 'center' } : {}),
                    },
                },
            },
        };
    });

    const dynamicColumns = [
        {
            id: 'serial',
            header: 'SL',
            size: 50,
            muiTableHeadCellProps: {
                align: 'center',
                sx: { px: 0 },
            },
            muiTableBodyCellProps: {
                align: 'center',
                sx: { px: 0 },
            },
            Cell: ({ row }) => {
                return data.length - row.index;
            },
        },

        ...normalizedColumns,
        ...(hasActionPermissions ? [{
            id: 'actions',
            header: 'Actions',
            size: 1,
            minSize: 1,
            maxSize: 180,
            grow: false,
            muiTableHeadCellProps: {
                align: 'center',
                sx: { px: 0 },
            },
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

                    {permissions.canView && (
                        <button
                            className="actionBtn actionBtnView"
                            onClick={(e) => {
                                e.stopPropagation();
                                onView(row.original);
                            }}
                        >
                            <VisibilityIcon style={{ width: 17, height: 17 }} />
                        </button>
                    )}

                    {permissions.canEdit && (
                        <button
                            className="actionBtn actionBtnEdit"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(row.original);
                            }}
                        >
                            <EditIcon style={{ width: 17, height: 17 }} />
                        </button>
                    )}

                    {permissions.canDelete && (
                        <button
                            className="actionBtn actionBtnDelete"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(row.original);
                            }}
                        >
                            <DeleteIcon style={{ width: 17, height: 17 }} />
                        </button>
                    )}

                </div>

            ),
        }] : []),
    ];

    return (
        <MaterialReactTable
            data={data}
            columns={dynamicColumns}
            muiTableBodyRowProps={({ row }) => ({
                className: highlightedRowId && row.original?._id === highlightedRowId ? 'crmRowHighlight' : '',
                sx: {
                    cursor: "default",
                },
            })}

            enableFullScreenToggle={false}
            enableDensityToggle={false}
            autoResetPageIndex={false}
            initialState={{ density: 'compact' }}
            onPaginationChange={setPagination}
            state={{ pagination }}
            muiPaginationProps={{ rowsPerPageOptions: [10, 50, 100] }}
            enableColumnActions={false}
            enableCellActions={true}
            muiTablePaperProps={{
                className: 'crmDataTablePaper',
            }}
            muiTableContainerProps={{
                className: 'crmDataTableContainer',
            }}
            muiTopToolbarProps={{
                className: 'crmDataTableToolbar',
            }}
            muiBottomToolbarProps={{
                className: 'crmDataTableFooter',
            }}
            renderTopToolbarCustomActions={() =>
                userType !== "Management" && (
                    <section className="crmDataTableExportWrap">
                        <Button className="text-black! capitalize!" onClick={handleExportCsv} startIcon={<IosShareTwoToneIcon />}>
                            Export
                        </Button>
                    </section>
                )
            }

        />
    );
}
