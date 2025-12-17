import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import WorkIcon from "@mui/icons-material/Work";

const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "90%",
    maxWidth: 500,
    maxHeight: "90vh",
    bgcolor: "background.paper",
    boxShadow: 24,
    p: 3,
    overflowY: "auto",
    borderRadius: 3,
};

export default function View({ open, onClose, viewData }) {
    const personalInfo = [
        { label: "Client Name", value: viewData?.name },
        { label: "Companies", value: viewData?.company },
        { label: "Agent", value: viewData?.agent },
        { label: "Phone", value: viewData?.phone },
        { label: "Alternative Phone", value: viewData?.alt_phone },
        { label: "Email", value: viewData?.email },
    ];

    const businessInfo = [
        { label: "Description", value: viewData?.description },
    ];

    const renderFields = (fields) =>
        fields.map(
            (field, index) =>
                field.value && (
                    <Typography key={index} sx={{ mb: 0.5 }}>
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
                bgcolor: "grey.50",
            }}
        >
            <div className="flex items-center mb-2">
                {icon}
                <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: "bold" }}>
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
                    <Typography
                        variant="h5"
                        sx={{ fontWeight: "bold", letterSpacing: 0.5 }}
                    >
                        {viewData ? viewData.name : "Loading..."}
                    </Typography>
                    <div onClick={onClose} className="cursor-pointer">
                        <CloseIcon />
                    </div>
                </div>

                {viewData ? (
                    <>
                        <SectionCard icon={<PersonIcon color="primary" />} title="Personal Info">
                            {renderFields(personalInfo)}
                        </SectionCard>

                        <SectionCard icon={<WorkIcon color="warning" />} title="Detail Info">
                            {renderFields(businessInfo)}
                        </SectionCard>
                    </>
                ) : (
                    <Typography>Loading...</Typography>
                )}
            </Box>
        </Modal>
    );
}
