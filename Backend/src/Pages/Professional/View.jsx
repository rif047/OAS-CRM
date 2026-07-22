import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: 620,
    maxHeight: '90vh',
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 3,
    overflowY: 'auto',
    borderRadius: 3,
};

export default function View({ open, onClose, viewData }) {
    const personalInfo = [
        { label: 'Name', value: viewData?.name },
        { label: 'Contact Number', value: viewData?.phone },
        { label: 'Alternative Number', value: viewData?.alt_phone },
        { label: 'Email', value: viewData?.email },
    ];

    const businessInfo = [
        { label: 'Companies', value: viewData?.company },
        { label: 'Address', value: viewData?.address },
        { label: 'Sector', value: viewData?.sector },
        { label: 'Agent', value: viewData?.agent },
    ];

    const renderFields = (fields) =>
        fields.map(
            (field) =>
                field.value && (
                    <Typography key={field.label} sx={{ mb: 0.5 }}>
                        <span className="font-semibold">{field.label}:</span> {field.value}
                    </Typography>
                )
        );

    const SectionCard = ({ icon, title, children }) => (
        <Paper
            elevation={2}
            sx={{
                p: 2,
                borderRadius: 3,
                mb: 2,
                bgcolor: 'grey.50',
            }}
        >
            <div className="flex items-center mb-2">
                {icon}
                <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: 'bold' }}>
                    {title}
                </Typography>
            </div>
            <Divider sx={{ mb: 1 }} />
            {children}
        </Paper>
    );

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={modalStyle}>
                <div className="flex justify-between items-center mb-4">
                    <Typography variant="h5" sx={{ fontWeight: 'bold', letterSpacing: 0.5 }}>
                        {viewData ? viewData.name : 'Loading...'}
                    </Typography>
                    <button type="button" onClick={onClose} className="cursor-pointer bg-transparent border-0 p-0">
                        <CloseIcon />
                    </button>
                </div>

                {viewData ? (
                    <>
                        <SectionCard icon={<PersonIcon color="primary" />} title="Contact Info">
                            {renderFields(personalInfo)}
                        </SectionCard>

                        <SectionCard icon={<WorkIcon color="warning" />} title="Professional Info">
                            {renderFields(businessInfo)}
                        </SectionCard>

                        <SectionCard icon={<WorkIcon color="success" />} title="Description">
                            <div
                                className="description-view text-slate-700 text-[14px]"
                                dangerouslySetInnerHTML={{
                                    __html: viewData.description || 'No description provided.',
                                }}
                            />
                        </SectionCard>
                    </>
                ) : (
                    <Typography>Loading...</Typography>
                )}
            </Box>
        </Modal>
    );
}
