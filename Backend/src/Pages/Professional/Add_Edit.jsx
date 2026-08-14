import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, Box, Button, IconButton, Modal, TextField, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { markEditedRowForHighlight } from '../../utils/datatableState';
import { PROFESSIONAL_SECTORS } from './professionalOptions';

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(95vw, 720px)',
    maxHeight: '92vh',
    bgcolor: '#ffffff',
    boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
    p: { xs: 2, sm: 2.5 },
    borderRadius: 3,
    border: '1px solid #e5e7eb',
    overflowY: 'auto',
};

const getBackendMessage = (error) => {
    const data = error?.response?.data;
    if (typeof data === 'string') return data;
    if (data?.error) return String(data.error);
    return '';
};

export default function AddEditProfessional({ open, onClose, data, refreshData }) {
    const EndPoint = 'professionals';
    const isEdit = Boolean(data?._id);

    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [sectorOptions, setSectorOptions] = useState(PROFESSIONAL_SECTORS);

    useEffect(() => {
        const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');

        if (data) {
            setFormData({
                ...data,
                agent: data.agent || loggedUser?.name || '',
                sector: data.sector || '',
            });
        } else {
            setFormData({
                agent: loggedUser?.name || '',
                name: '',
                phone: '',
                alt_phone: '',
                company: '',
                address: '',
                email: '',
                sector: '',
                description: '',
            });
        }

        setErrors({});
    }, [data]);

    useEffect(() => {
        let ignore = false;

        const fetchMeta = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}/meta`);
                const sectors = Array.isArray(response.data?.sectors) ? response.data.sectors : [];
                if (!ignore && sectors.length) setSectorOptions(sectors);
            } catch {
                if (!ignore) setSectorOptions(PROFESSIONAL_SECTORS);
            }
        };

        fetchMeta();
        return () => {
            ignore = true;
        };
    }, []);

    const allSectorOptions = useMemo(() => {
        const currentSector = String(formData.sector || '').trim();
        if (!currentSector || sectorOptions.includes(currentSector)) return sectorOptions;
        return [...sectorOptions, currentSector];
    }, [formData.sector, sectorOptions]);

    const validate = () => {
        const newErrors = {};
        const { name, phone, alt_phone, email, sector } = formData;

        if (!String(name || '').trim()) newErrors.name = 'Name is required.';
        if (!String(sector || '').trim()) newErrors.sector = 'Sector is required.';
        if (phone && !/^\+?\d+$/.test(phone)) newErrors.phone = 'Contact number must contain numbers.';
        if (alt_phone && !/^\+?\d+$/.test(alt_phone)) newErrors.alt_phone = 'Alternative number must contain numbers.';
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleSectorChange = (value) => {
        setFormData((prev) => ({ ...prev, sector: value || '' }));
        setErrors((prev) => ({ ...prev, sector: '' }));
    };

    const handleSubmit = async () => {
        if (!validate() || loading) return;
        setLoading(true);

        try {
            const payload = { ...formData };
            if (isEdit) delete payload.description;

            const url = `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}${isEdit ? `/${data._id}` : ''}`;
            const method = isEdit ? 'patch' : 'post';
            await axios[method](url, payload);
            if (isEdit) markEditedRowForHighlight(data._id);
            toast.success(isEdit ? 'Updated successfully.' : 'Created successfully.');
            refreshData();
            onClose();
        } catch (error) {
            const message = getBackendMessage(error);
            toast.error(message || 'Failed to save data.');
            setErrors({
                ...(message.includes('Phone number already exists') && { phone: 'Contact number already exists.' }),
                ...(message.includes('Email already exists') && { email: 'Email already exists.' }),
            });
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
                        {isEdit ? 'Update Professional' : 'Create Professional'}
                    </Typography>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                <Box className="crm-form-row">
                    <TextField
                        name="name"
                        label="Name*"
                        fullWidth
                        size="small"
                        value={formData.name || ''}
                        onChange={handleChange}
                        error={!!errors.name}
                        helperText={errors.name}
                    />
                    <TextField
                        name="company"
                        label="Companies"
                        fullWidth
                        size="small"
                        value={formData.company || ''}
                        onChange={handleChange}
                    />
                </Box>

                <Box className="crm-form-row">
                    <TextField
                        name="phone"
                        label="Contact Number"
                        fullWidth
                        size="small"
                        value={formData.phone || ''}
                        onChange={handleChange}
                        error={!!errors.phone}
                        helperText={errors.phone}
                    />
                    <TextField
                        name="alt_phone"
                        label="Alternative Number"
                        fullWidth
                        size="small"
                        value={formData.alt_phone || ''}
                        onChange={handleChange}
                        error={!!errors.alt_phone}
                        helperText={errors.alt_phone}
                    />
                </Box>

                <Box className="crm-form-row">
                    <TextField
                        name="email"
                        label="Email"
                        fullWidth
                        size="small"
                        value={formData.email || ''}
                        onChange={handleChange}
                        error={!!errors.email}
                        helperText={errors.email}
                    />
                    <Autocomplete
                        autoHighlight
                        selectOnFocus
                        clearOnBlur
                        handleHomeEndKeys
                        freeSolo
                        size="small"
                        options={allSectorOptions}
                        value={formData.sector || ''}
                        inputValue={formData.sector || ''}
                        onChange={(_, newValue) => handleSectorChange(newValue || '')}
                        onInputChange={(_, newInputValue) => handleSectorChange(newInputValue)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Sector*"
                                error={!!errors.sector}
                                helperText={errors.sector}
                            />
                        )}
                    />
                </Box>

                <TextField
                    name="address"
                    label="Address"
                    fullWidth
                    size="small"
                    margin="normal"
                    multiline
                    minRows={2}
                    value={formData.address || ''}
                    onChange={handleChange}
                />

                {!isEdit && (
                    <TextField
                        fullWidth
                        label="Description"
                        name="description"
                        size="small"
                        margin="normal"
                        multiline
                        minRows={5}
                        value={formData.description || ''}
                        onChange={handleChange}
                        error={!!errors.description}
                        helperText={errors.description}
                        sx={{ mb: 2 }}
                    />
                )}

                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="crm-submit-btn"
                >
                    {isEdit ? 'Update' : 'Create'}
                </Button>
            </Box>
        </Modal>
    );
}
