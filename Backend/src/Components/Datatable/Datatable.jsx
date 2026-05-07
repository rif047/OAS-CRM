import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const EXCLUDED_FIELDS = ['_id', 'secret_code', 'password', '__v', 'images'];
const CENTERED_COLUMNS = new Set(['stage', 'setstatus', 'set_status', 'actions', 'payment']);
const ZERO_HORIZONTAL_PADDING_COLUMNS = new Set(['date', 'code', 'payment', 'stage', 'set_status', 'setstatus', 'actions']);

function Datatable({
    columns,
    data,
    onEdit,
    onView,
    onDelete,
    permissions,
    defaultPageSize = 10,
    forceDefaultPageSize = false,
    serverMode = false,
    totalRows = 0,
    isLoading = false,
    onServerQueryChange,
    serverSearchDebounceMs = 350,
}) {
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
    const [globalFilter, setGlobalFilter] = useState('');
    const [debouncedGlobalFilter, setDebouncedGlobalFilter] = useState('');
    const [sorting, setSorting] = useState([]);
    const previousSearchRef = useRef('');
    const effectiveTotalRows = serverMode ? totalRows : data.length;
    const totalPages = Math.max(1, Math.ceil(effectiveTotalRows / Math.max(1, pagination.pageSize)));
    const currentPage = Math.min(totalPages, pagination.pageIndex + 1);
    const pageStart = effectiveTotalRows === 0 ? 0 : (pagination.pageIndex * pagination.pageSize) + 1;
    const pageEnd = Math.min(effectiveTotalRows, (pagination.pageIndex * pagination.pageSize) + pagination.pageSize);

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

        if (!serverMode && pagination.pageIndex > maxPageIndex) {
            setPagination((prev) => ({ ...prev, pageIndex: maxPageIndex }));
        }
    }, [data.length, pagination.pageIndex, pagination.pageSize, serverMode]);

    useEffect(() => {
        if (!serverMode) return;
        const totalPages = Math.max(1, Math.ceil(Math.max(0, Number(totalRows) || 0) / Math.max(1, pagination.pageSize)));
        const maxPageIndex = Math.max(totalPages - 1, 0);
        if (pagination.pageIndex > maxPageIndex) {
            setPagination((prev) => (prev.pageIndex === maxPageIndex ? prev : { ...prev, pageIndex: maxPageIndex }));
        }
    }, [pagination.pageIndex, pagination.pageSize, serverMode, totalRows]);

    useEffect(() => {
        if (!serverMode) return;
        const normalizedGlobalFilter = typeof globalFilter === 'string' ? globalFilter : String(globalFilter ?? '');
        const timeoutId = setTimeout(() => {
            setDebouncedGlobalFilter(normalizedGlobalFilter.trim());
        }, serverSearchDebounceMs);

        return () => clearTimeout(timeoutId);
    }, [globalFilter, serverMode, serverSearchDebounceMs]);

    useEffect(() => {
        if (!serverMode) return;
        if (previousSearchRef.current === debouncedGlobalFilter) return;
        previousSearchRef.current = debouncedGlobalFilter;
        setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
    }, [debouncedGlobalFilter, serverMode]);

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

    useEffect(() => {
        if (!serverMode || typeof onServerQueryChange !== 'function') return;
        const primarySort = Array.isArray(sorting) && sorting.length ? sorting[0] : null;
        onServerQueryChange({
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedGlobalFilter,
            sortBy: primarySort?.id || '',
            sortDir: primarySort?.desc ? 'desc' : 'asc',
        });
    }, [debouncedGlobalFilter, onServerQueryChange, pagination.pageIndex, pagination.pageSize, serverMode, sorting]);

    const handleGlobalFilterChange = useCallback((updater) => {
        setGlobalFilter((prev) => {
            const resolvedValue = typeof updater === 'function' ? updater(prev) : updater;
            if (typeof resolvedValue === 'string') return resolvedValue;
            if (resolvedValue == null) return '';
            return String(resolvedValue);
        });
    }, []);


    const handleExportCsv = useCallback(() => {
        const filteredData = data.map(row => {
            const filteredRow = { ...row };
            EXCLUDED_FIELDS.forEach(field => delete filteredRow[field]);

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
    }, [data]);

    const handleCopyText = useCallback(async (event, value) => {
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
    }, []);


    const normalizedColumns = useMemo(() => columns.map((column) => {
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
            CENTERED_COLUMNS.has(normalizedId) ||
            CENTERED_COLUMNS.has(plainId) ||
            isCodeColumn ||
            isDateColumn;
        const shouldZeroHorizontalPadding = ZERO_HORIZONTAL_PADDING_COLUMNS.has(normalizedId) || ZERO_HORIZONTAL_PADDING_COLUMNS.has(plainId);

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
    }), [columns, copiedCodeKey, handleCopyText]);

    const dynamicColumns = useMemo(() => ([
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
            Cell: ({ row, table, staticRowIndex }) => {
                const pageStartOffset = pagination.pageIndex * pagination.pageSize;
                const rowIndexOnCurrentPage =
                    Number.isInteger(staticRowIndex)
                        ? staticRowIndex
                        : Math.max(table.getRowModel().rows.findIndex((item) => item.id === row.id), 0);
                const totalCount = serverMode ? totalRows : data.length;

                return Math.max(totalCount - (pageStartOffset + rowIndexOnCurrentPage), 0);
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
    ]), [
        data.length,
        normalizedColumns,
        hasActionPermissions,
        onDelete,
        onEdit,
        onView,
        pagination.pageIndex,
        pagination.pageSize,
        permissions,
        serverMode,
        totalRows,
    ]);

    return (
        <MaterialReactTable
            data={data}
            columns={dynamicColumns}
            manualPagination={serverMode}
            manualFiltering={serverMode}
            manualSorting={serverMode}
            muiTableBodyRowProps={({ row }) => ({
                className: highlightedRowId && row.original?._id === highlightedRowId ? 'crmRowHighlight' : '',
                sx: {
                    cursor: "default",
                },
            })}

            enableFullScreenToggle={false}
            enableDensityToggle={false}
            autoResetPageIndex={false}
            initialState={{ density: 'compact', ...(serverMode ? { showGlobalFilter: true } : {}) }}
            onPaginationChange={setPagination}
            onGlobalFilterChange={serverMode ? handleGlobalFilterChange : undefined}
            onSortingChange={serverMode ? setSorting : undefined}
            state={{
                pagination,
                isLoading,
                ...(serverMode ? { globalFilter, sorting } : {}),
            }}
            paginationDisplayMode="pages"
            muiPaginationProps={{
                rowsPerPageOptions: [10, 50, 100],
                showRowsPerPage: true,
                variant: 'outlined',
                shape: 'rounded',
                showFirstButton: true,
                showLastButton: true,
                siblingCount: 0,
                boundaryCount: 1,
                size: 'small',
            }}
            rowCount={serverMode ? totalRows : undefined}
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
            renderBottomToolbarCustomActions={() => (
                <section className="crmDataTablePaginationMeta" aria-live="polite">
                    <span className="crmDataTablePageBadge">{`Page ${currentPage} of ${totalPages}`}</span>
                    <span className="crmDataTableRowsBadge">{`${pageStart}-${pageEnd} of ${effectiveTotalRows}`}</span>
                </section>
            )}
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

export default memo(Datatable);
