import { useState, useEffect } from 'react';
import { Box, Button, Typography, Modal, IconButton, TextField, Autocomplete } from '@mui/material';
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

export default function AddEditEmployee({ open, onClose, data, refreshData }) {
    const EndPoint = 'employees';

    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);


    useEffect(() => {
        const loggedUser = JSON.parse(localStorage.getItem('user'));

        if (data) {
            setFormData({ ...data, management: data.management || loggedUser?.name });
        } else {
            setFormData({ management: loggedUser?.name || '' });
        }

        setErrors({});
    }, [data]);

    const validate = () => {
        const newErrors = {};
        const { name, phone, address, availability, experience, position, city, right_to_work } = formData;

        if (!name) newErrors.name = 'Name is required.';
        if (!/^\d+$/.test(phone || '')) newErrors.phone = 'Phone number must contain numbers.';
        if (!address) newErrors.address = 'Address is required.';
        if (!availability) newErrors.availability = 'Availability is required.';
        if (!experience) newErrors.experience = 'Experience is required.';
        if (!right_to_work) newErrors.right_to_work = 'Right to work is required.';
        if (!city || city.length === 0) newErrors.city = 'Preferred Cities are required.';
        if (!position || position.length === 0) newErrors.position = 'Position are required.';

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
        } catch (error) {
            const backendErrors = error.response?.data || {};
            toast.error(error.response?.data || "Failed to submit data.");
            setErrors({
                ...backendErrors.includes?.('Phone number already exists') && { phone: 'Phone number already exists.' }
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open}>
            <Box sx={modalStyle} className='max-h-[95vh] overflow-y-auto'>
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
                    { name: 'name', label: 'Employee Name*' },
                    { name: 'phone', label: 'Phone*' },
                    { name: 'alt_phone', label: 'Alternative Phone' },
                    { name: 'address', label: 'Address*' },
                    { name: 'city', label: 'City*' },
                    { name: 'preferred_location', label: 'Preferred Location*' },
                    { name: 'position', label: 'Position*' },
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


                <Autocomplete
                    fullWidth
                    size="small"
                    options={[
                        "No Experience",
                        "1 - 6 Months",
                        "7 - 12 Months",
                        "1 Year",
                        "2 - 3 Years",
                        "4 - 5 Years",
                        "6 - 7 Years",
                        "8 - 9 Years",
                        "10+ Years",
                    ]}
                    value={formData.experience || null}
                    onChange={(e, newVal) =>
                        setFormData((prev) => ({ ...prev, experience: newVal || "" }))
                    }
                    autoHighlight
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Experience*"
                            margin="normal"
                            error={!!errors.experience}
                            helperText={errors.experience}
                        />
                    )}
                />

                <Autocomplete
                    fullWidth
                    size="small"
                    options={["Yes", "No"]}
                    value={formData.right_to_work || null}
                    onChange={(e, newVal) =>
                        setFormData((prev) => ({ ...prev, right_to_work: newVal || "" }))
                    }
                    autoHighlight
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Right To Work*"
                            margin="normal"
                            error={!!errors.right_to_work}
                            helperText={errors.right_to_work}
                        />
                    )}
                />

                <Autocomplete
                    fullWidth
                    size="small"
                    options={["Full-Time", "Part-Time", "Not Available"]}
                    value={formData.availability || null}
                    onChange={(e, newVal) =>
                        setFormData((prev) => ({ ...prev, availability: newVal || "" }))
                    }
                    autoHighlight
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Availability*"
                            margin="normal"
                            error={!!errors.availability}
                            helperText={errors.availability}
                        />
                    )}
                />



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
