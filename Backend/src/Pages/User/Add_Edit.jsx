import { useState, useEffect } from 'react';
import { Box, Button, Typography, Modal, TextField, MenuItem, IconButton, InputAdornment, Autocomplete } from '@mui/material';
import { Visibility, VisibilityOff, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';
import { markEditedRowForHighlight } from '../../utils/datatableState';
import { COMPANY_OPTIONS } from '../../utils/companies';

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

export default function AddEditUser({ open, onClose, data, refreshData }) {
    const EndPoint = 'users';

    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword((prev) => !prev);
    };


    useEffect(() => {
        if (data) {
            const { password: _password, ...restData } = data;
            setFormData(restData);
        } else {
            setFormData({});
        }
        setErrors({});
    }, [data]);

    const validate = () => {
        const newErrors = {};
        const { name, phone, username, email, password, userType, secret_code, designation, assignedCompanies } = formData;

        if (!name) newErrors.name = 'Name is required.';
        if (!phone) newErrors.phone = 'Phone is required.';
        if (!username) newErrors.username = 'Username is required.';
        if (!email) newErrors.email = 'Email is required.';
        if (!designation) newErrors.designation = 'Designation is required.';
        if (!data && !password) newErrors.password = 'Password is required.';
        if (!secret_code) newErrors.secret_code = 'Secret Word is required.';
        if (!userType) newErrors.userType = 'User Type is required.';
        if (!Array.isArray(assignedCompanies) || assignedCompanies.length === 0) newErrors.assignedCompanies = 'At least one assigned company is required.';


        if (!/^\d+$/.test(phone || '')) newErrors.phone = 'Phone number must contain numbers.';
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { newErrors.email = 'Already exist || Invalid email address' }

        if (password && password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters long.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            if (name === 'userType') {
                return {
                    ...prev,
                    [name]: value,
                    assignedCompanies: value === 'Admin' ? [...COMPANY_OPTIONS] : (Array.isArray(prev.assignedCompanies) ? prev.assignedCompanies : []),
                };
            }
            return { ...prev, [name]: value };
        });
        setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async () => {
        if (!validate() || loading) return;
        setLoading(true);

        try {
            const url = `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}${data?._id ? `/${data._id}` : ''}`;
            const method = data?._id ? 'patch' : 'post';

            const submissionData = { ...formData };
            if (data && !submissionData.password) {
                delete submissionData.password;
            }

            await axios[method](url, submissionData);
            if (data?._id) markEditedRowForHighlight(data._id);
            toast.success(data?._id ? 'Updated successfully.' : 'Created successfully.');
            refreshData();
            onClose();
        } catch (error) {
            const backendErrors = error.response?.data || {};
            toast.error('Failed to update data.');
            setErrors({
                ...backendErrors.includes('Phone already exists. Use different one.') && { phone: 'Phone already exists. Use different one.' },
                ...backendErrors.includes('Email already exists. Use different one.') && { email: 'Email already exists. Use different one.' },
                ...backendErrors.includes('Username already exists. Use different one.') && { username: 'Username already exists. Use different one.' },
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

                <TextField
                    select
                    label="Select User Type*"
                    name="userType"
                    fullWidth
                    margin="normal"
                    size="small"
                    style={{ marginBottom: '15px' }}
                    value={formData.userType || ''}
                    onChange={handleChange}
                    error={!!errors.userType}
                    helperText={errors.userType}
                >
                    <MenuItem value="Admin">Admin</MenuItem>
                    <MenuItem value="Management">Management</MenuItem>
                    <MenuItem value="Surveyor">Surveyor</MenuItem>
                    <MenuItem value="Designer">Designer</MenuItem>
                </TextField>
                <Autocomplete
                    multiple
                    size="small"
                    options={COMPANY_OPTIONS}
                    value={Array.isArray(formData.assignedCompanies) ? formData.assignedCompanies : []}
                    disableCloseOnSelect
                    onChange={(_, value) => {
                        setFormData((prev) => ({ ...prev, assignedCompanies: value }));
                        setErrors((prev) => ({ ...prev, assignedCompanies: '' }));
                    }}
                    sx={{
                        mt: 0.5,
                        mb: 0.5,
                        '& .MuiAutocomplete-inputRoot': {
                            minHeight: 54,
                            alignItems: 'center',
                            borderRadius: '10px',
                            backgroundColor: '#f8fafc',
                            transition: 'all .2s ease',
                        },
                        '& .MuiAutocomplete-inputRoot.Mui-focused': {
                            backgroundColor: '#ffffff',
                            boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.12)',
                        },
                        '& .MuiAutocomplete-tag': {
                            height: 26,
                            borderRadius: '999px',
                            backgroundColor: '#e2e8f0',
                            color: '#1e293b',
                            fontWeight: 600,
                            border: '1px solid #cbd5e1',
                            '& .MuiChip-deleteIcon': {
                                color: '#64748b',
                            },
                            '& .MuiChip-deleteIcon:hover': {
                                color: '#334155',
                            },
                        },
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            margin="normal"
                            label="Assigned Company*"
                            error={!!errors.assignedCompanies}
                            helperText={errors.assignedCompanies}
                        />
                    )}
                />

                {[
                    { name: 'name', label: 'Name*' },
                    { name: 'phone', label: 'Phone*' },
                    { name: 'email', label: 'Email*' },
                    { name: 'designation', label: 'Designation*' },
                    { name: 'username', label: 'Username*' },
                ].map(({ name, label, type = 'text' }) => (
                    <TextField
                        key={name}
                        name={name}
                        label={label}
                        type={type}
                        fullWidth
                        margin="normal"
                        size="small"
                        value={formData[name] || ''}
                        onChange={handleChange}
                        error={!!errors[name]}
                        helperText={errors[name]}
                        disabled={data && name === 'username'}
                    />
                ))}


                <TextField
                    key="password"
                    name="password"
                    label={data ? 'New Password' : 'Password*'}
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    margin="normal"
                    size="small"
                    value={formData.password || ''}
                    onChange={handleChange}
                    error={!!errors.password}
                    helperText={errors.password}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton onClick={togglePasswordVisibility} edge="end">
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />


                <TextField
                    fullWidth
                    label="Set a Secret Word*"
                    name="secret_code"
                    size="small"
                    margin="normal"
                    value={formData.secret_code}
                    onChange={handleChange}
                    error={!!errors.secret_code}
                    helperText={errors.secret_code}
                />

                <small className='text-gray-600 ml-2'>You'll need this to recover your password.</small>

                <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    size="small"
                    margin="normal"
                    multiline
                    minRows={5}
                    value={formData.description}
                    onChange={handleChange}
                />





                <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={handleSubmit} disabled={loading} className='crm-submit-btn'>
                    {data ? 'Update' : 'Create'}
                </Button>
            </Box>
        </Modal>
    );
}
