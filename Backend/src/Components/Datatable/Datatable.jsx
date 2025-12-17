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


    const dynamicColumns = [
        {
            id: 'serial',
            header: 'SL',
            size: 50,
            Cell: ({ row }) => {
                return data.length - row.index;
            },
        },


        ...columns,
        {
            id: 'actions',
            header: 'Actions',
            maxSize: 130,
            Cell: ({ row }) => (
                <div className="space-x-2">

                    {permissions.canView && (
                        <button
                            className="actionBtn cursor-pointer px-2 py-0.5 rounded hover:shadow-2xl bg-blue-100 hover:bg-blue-300"
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
                            className="actionBtn cursor-pointer px-2 py-0.5 rounded hover:shadow-2xl bg-orange-100 hover:bg-orange-300"
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
                            className="actionBtn cursor-pointer px-2 py-0.5 rounded hover:shadow-2xl bg-red-100 text-red-500 hover:bg-red-200"
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
            renderTopToolbarCustomActions={() =>
                userType !== "Management" && (
                    <section>
                        <Button className="text-black! capitalize!" onClick={handleExportCsv} startIcon={<IosShareTwoToneIcon />}>
                            Export
                        </Button>
                    </section>
                )
            }

        />
    );
}

