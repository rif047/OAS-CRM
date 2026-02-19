import { MaterialReactTable } from 'material-react-table';
import { Button } from '@mui/material';
import { mkConfig, generateCsv, download } from 'export-to-csv';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IosShareTwoToneIcon from '@mui/icons-material/IosShareTwoTone';
import VisibilityIcon from '@mui/icons-material/Visibility';
import './MUI.css';

export default function Datatable({ columns, data, onEdit, onView, onDelete, permissions }) {

    const excludedFields = ['_id', 'secret_code', 'password', '__v', 'images'];
    const centeredColumns = new Set(['stage', 'setstatus', 'set_status', 'actions']);

    const userType = localStorage.getItem("userType");


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


    const normalizedColumns = columns.map((column) => {
        const normalizedId = String(
            column.id || column.key || column.accessorKey || column.header || ''
        ).toLowerCase().replace(/\s+/g, '_');
        const plainId = normalizedId.replace(/_/g, '');
        const shouldCenter = centeredColumns.has(normalizedId) || centeredColumns.has(plainId);
        const isSetStatus = normalizedId === 'set_status' || plainId === 'setstatus';

        if (!shouldCenter) return column;

        return {
            ...column,
            ...(isSetStatus && {
                size: column.size ?? 1,
                minSize: column.minSize ?? 1,
                maxSize: column.maxSize ?? 320,
                grow: false,
            }),
            muiTableHeadCellProps: {
                ...column.muiTableHeadCellProps,
                align: 'center',
                sx: {
                    ...(column.muiTableHeadCellProps?.sx || {}),
                    ...(isSetStatus ? { width: '1%', whiteSpace: 'nowrap', px: '6px' } : {}),
                },
            },
            muiTableBodyCellProps: {
                ...column.muiTableBodyCellProps,
                align: 'center',
                sx: {
                    ...(column.muiTableBodyCellProps?.sx || {}),
                    ...(isSetStatus ? { width: '1%', whiteSpace: 'nowrap', px: '6px' } : {}),
                    '& > div': {
                        justifyContent: 'center',
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
            Cell: ({ row }) => {
                return data.length - row.index;
            },
        },

        ...normalizedColumns,
        {
            id: 'actions',
            header: 'Actions',
            size: 1,
            minSize: 1,
            maxSize: 180,
            grow: false,
            muiTableHeadCellProps: {
                align: 'center',
            },
            muiTableBodyCellProps: {
                align: 'center',
                sx: {
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
        },
    ];

    return (
        <MaterialReactTable
            data={data}
            columns={dynamicColumns}
            muiTableBodyRowProps={({ row }) => ({
                onClick: () => {
                    if (permissions.canView) {
                        onView(row.original);
                    }
                },
                sx: {
                    cursor: permissions.canView ? "pointer" : "default",
                },
            })}

            enableFullScreenToggle={false}
            enableDensityToggle={false}
            initialState={{
                density: 'compact',
                pagination: { pageSize: 10, pageIndex: 0 },
            }}
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
