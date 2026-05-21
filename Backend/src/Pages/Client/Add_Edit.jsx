import { useState, useEffect } from 'react';
import { Box, Button, Typography, Modal, IconButton, TextField, MenuItem } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { markEditedRowForHighlight } from '../../utils/datatableState';
import { getAssignedCompaniesFromUser } from '../../utils/companies';

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(95vw, 620px)',
    maxHeight: '92vh',
    bgcolor: '#ffffff',
    boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
    p: { xs: 2, sm: 2.5 },
    borderRadius: 3,
    border: '1px solid #e5e7eb',
    overflowY: 'auto',
};

export default function AddEditClient({ open, onClose, data, refreshData }) {
    const EndPoint = 'clients';

    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [assignedCompanies, setAssignedCompanies] = useState([]);

    // const capitalizeWords = (str) => { return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '); };


    useEffect(() => {
        const loggedUser = JSON.parse(localStorage.getItem('user'));
        const companies = getAssignedCompaniesFromUser();
        setAssignedCompanies(companies);

        if (data) {
            setFormData({ ...data, agent: data.agent || loggedUser?.name, access_company: data.access_company || companies[0] || '' });
        } else {
            setFormData({ agent: loggedUser?.name || '', access_company: companies[0] || '' });
        }

        setErrors({});
    }, [data]);


    const validate = () => {
        const newErrors = {};
        const { name, phone, alt_phone, email, access_company } = formData;

        if (!name) newErrors.name = 'Name is required.';
        if (!access_company) newErrors.access_company = 'Assigned company is required.';
        if (phone && !/^\+?\d+$/.test(phone || '')) { newErrors.phone = 'Phone number must contain numbers.' }
        if (alt_phone && !/^\+?\d+$/.test(alt_phone)) { newErrors.alt_phone = "Alternative Phone number must contain numbers." }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { newErrors.email = 'Invalid email format.'; }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async () => {
        if (!validate() || loading) return;
        setLoading(true);

        try {
            const url = `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}${data?._id ? `/${data._id}` : ''}`;
            const method = data?._id ? 'patch' : 'post';
            await axios[method](url, formData);
            if (data?._id) markEditedRowForHighlight(data._id);
            toast.success(data?._id ? 'Updated successfully.' : 'Created successfully.');
            refreshData();
            onClose();
        } catch (err) {
            console.log(err)
            toast.error('Failed to update data.');
            const backendErrors = err.response?.data || {};
            setErrors({
                ...backendErrors.includes?.('Phone number already exists') && { phone: 'Phone number already exists.' },
                ...backendErrors.includes?.('Email already exists') && { email: 'Email already exists.' }
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open}>
            <Box sx={modalStyle} className='crm-form-modal'>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1}
                    className="crm-form-header"
                    sx={{ position: 'sticky', top: -16, backgroundColor: '#ffffff', zIndex: 10, pb: 1 }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
                        {data ? 'Update Data' : 'Create New'}
                    </Typography>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>



                {[
                    { name: 'name', label: 'Client Name*' },
                    { name: 'company', label: 'Client Companies' },
                    { name: 'phone', label: 'Phone' },
                    { name: 'alt_phone', label: 'Alternative Phone' },
                    { name: 'email', label: 'Email' },
                ].map(({ name, label }) => (
                    <TextField
                        key={name}
                        name={name}
                        label={label}
                        type={'text'}
                        fullWidth
                        margin="normal"
                        size="small"
                        value={formData[name] || ''}
                        onChange={handleChange}
                        error={!!errors[name]}
                        helperText={errors[name]}
                    />
                ))}
                <TextField
                    select
                    name="access_company"
                    label="Assigned Company*"
                    fullWidth
                    margin="normal"
                    size="small"
                    value={formData.access_company || ''}
                    onChange={handleChange}
                    error={!!errors.access_company}
                    helperText={errors.access_company}
                >
                    {assignedCompanies.map((company) => (
                        <MenuItem key={company} value={company}>{company}</MenuItem>
                    ))}
                </TextField>


                <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    size="small"
                    margin="normal"
                    multiline
                    minRows={5}
                    value={formData.description || ""}
                    onChange={handleChange}
                    error={!!errors.description}
                    helperText={errors.description}
                    sx={{ mb: 2 }}
                />


                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    className='crm-submit-btn'
                >
                    {data ? 'Update' : 'Create'}
                </Button>
            </Box>
        </Modal>
    );
}
