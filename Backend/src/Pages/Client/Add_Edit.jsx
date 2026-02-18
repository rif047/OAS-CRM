import { useState, useEffect } from 'react';
import { Box, Button, Typography, Modal, IconButton, TextField, Autocomplete, MenuItem } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: 500,
    bgcolor: '#fdfdfd',
    boxShadow: 24,
    p: 3,
    borderRadius: 2,
    overflowY: 'auto',
};

export default function AddEditClient({ open, onClose, data, refreshData }) {
    const EndPoint = 'clients';

    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    // const capitalizeWords = (str) => { return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '); };


    useEffect(() => {
        const loggedUser = JSON.parse(localStorage.getItem('user'));

        if (data) {
            setFormData({ ...data, agent: data.agent || loggedUser?.name });
        } else {
            setFormData({ agent: loggedUser?.name || '' });
        }

        setErrors({});
    }, [data]);


    const validate = () => {
        const newErrors = {};
        const { name, phone, alt_phone, email } = formData;

        if (!name) newErrors.name = 'Name is required.';
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
            <Box sx={modalStyle} className='max-h-[95vh]'>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1}
                    sx={{ position: 'sticky', top: 0, backgroundColor: '#fdfdfd', zIndex: 10, borderBottom: '1px solid #ddd', pb: 1, }}
                >
                    <Typography className='font-bold!' variant="h6">
                        {data ? 'Update Data' : 'Create New'}
                    </Typography>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>



                {[
                    { name: 'name', label: 'Client Name*' },
                    { name: 'company', label: 'Conpanies' },
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
                    className='bg-[#272e3f]! hover:bg-gray-700! font-bold!'
                >
                    {data ? 'Update' : 'Create'}
                </Button>
            </Box>
        </Modal>
    );
}
