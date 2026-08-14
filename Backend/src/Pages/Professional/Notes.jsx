import { useEffect, useState } from 'react';
import { Box, Button, IconButton, Modal, TextField, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { markEditedRowForHighlight } from '../../utils/datatableState';

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(95vw, 620px)',
    maxHeight: '90vh',
    bgcolor: '#ffffff',
    boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
    p: { xs: 2, sm: 2.5 },
    borderRadius: 3,
    border: '1px solid #e5e7eb',
    overflowY: 'auto',
};

export default function ProfessionalNotes({ open, onClose, data, refreshData }) {
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setNote('');
        setError('');
    }, [data]);

    const handleSubmit = async () => {
        if (loading) return;
        if (!note.trim()) {
            setError('Note is required.');
            return;
        }

        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            await axios.patch(`${import.meta.env.VITE_SERVER_URL}/api/professionals/${data._id}/notes`, {
                agent: user?.name || '',
                note,
            });
            markEditedRowForHighlight(data._id);
            toast.success('Note added successfully.');
            refreshData();
            onClose();
        } catch (err) {
            toast.error(err?.response?.data || 'Failed to add note.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open}>
            <Box sx={modalStyle} className="crm-form-modal">
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1}
                    className="crm-form-header"
                    sx={{ position: 'sticky', top: -16, backgroundColor: '#ffffff', zIndex: 10, pb: 1 }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                        Add Note
                    </Typography>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                <Typography sx={{ color: '#475569', fontWeight: 700, mb: 1 }}>
                    {data?.name || ''}
                </Typography>

                <TextField
                    fullWidth
                    label="Note"
                    multiline
                    minRows={7}
                    value={note}
                    onChange={(event) => {
                        setNote(event.target.value);
                        setError('');
                    }}
                    error={!!error}
                    helperText={error}
                    sx={{ mb: 2 }}
                />

                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="crm-submit-btn"
                >
                    Submit Note
                </Button>
            </Box>
        </Modal>
    );
}
