import { useState, useEffect } from "react";
import { Box, Button, Typography, Modal, IconButton, TextField, Autocomplete, } from "@mui/material";
import { Close as CloseIcon, Add as AddIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import axios from "axios";
import AddEditClient from "../Client/Add_Edit";

const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "90%",
    maxWidth: 700,
    bgcolor: "#fdfdfd",
    boxShadow: 24,
    p: 3,
    borderRadius: 2,
    overflowY: "auto",
};

export default function AddEdit({ open, onClose, data, refreshData }) {
    const EndPoint = "leads";

    const [errors, setErrors] = useState({});
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        client: "",
        address: "",
        company: "",
        property_name: "",
        property_type: "",
        extention_type: "",
        design_prepared: "",
        building_regulations_drawings: "",
        planning_permission: "",
        budget: "",
        when_start: "",
        file_link: "",
        source: "",
        source_link: "",
        remark: "",
    });
    const [clientModalOpen, setClientModalOpen] = useState(false);


    const fetchClients = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/clients`);
            setClients(res.data);
        } catch {
            toast.error("Failed to fetch clients.");
        }
    };


    useEffect(() => {
        const loggedUser = JSON.parse(localStorage.getItem('user'));

        if (data) {
            setFormData((prev) => ({
                ...prev,
                ...data,
                client: data.client?._id || data.client || "",
                agent: data.agent || loggedUser?.name
            }));

            if (data?.address) {
                const [pc, full] = data.address.split("-");
                setFormData((prev) => ({
                    ...prev,
                    post_code: pc || "",
                    full_address: full || "",
                }));
            }



        } else {
            setFormData({ agent: loggedUser?.name || '' });
        }

        setErrors({});
        fetchClients();
    }, [data]);



    const validate = () => {
        const newErrors = {};
        if (!formData.client) newErrors.client = "Client is required.";
        if (!formData.company) newErrors.company = "Company is required.";
        if (!formData.source) newErrors.source = "Source is required.";
        if (formData.budget && isNaN(parseFloat(formData.budget))) { newErrors.budget = "Budget must be a number."; }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleSubmit = async () => {
        if (!validate() || loading) return;
        setLoading(true);

        try {
            const url = `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}${data?._id ? `/${data._id}` : ""
                }`;
            const method = data?._id ? "patch" : "post";

            await axios[method](url, formData, { headers: { "Content-Type": "application/json" }, });

            toast.success(data?._id ? "Updated successfully." : "Created successfully.");
            refreshData();
            onClose();
        } catch (error) {
            const backendErrors = error.response?.data || {};
            toast.error(error.response?.data || "Failed to submit data.");
            setErrors({
                ...backendErrors.includes?.('Source link already exists') && { source_link: 'Source link already exists.' }
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Modal open={open}>
                <Box sx={modalStyle} className="max-h-[96vh] overflow-y-auto">
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={4}
                        sx={{ position: 'sticky', top: 0, backgroundColor: '#fdfdfd', zIndex: 10, borderBottom: '1px solid #ddd' }}
                    >
                        <Typography className='font-bold!' variant="h6">
                            {data ? 'Update Data' : 'Create New'}
                        </Typography>
                        <IconButton onClick={onClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    <Box display="flex" gap={1} alignItems="center">
                        <Autocomplete
                            sx={{ flex: 1 }}
                            size="small"
                            freeSolo
                            options={["OAS", "MLP", "KPCL"]}
                            value={formData.company || null}
                            onChange={(e, newVal) => {
                                setFormData((prev) => ({ ...prev, company: newVal || "" }));
                            }}
                            onInputChange={(e, newInputValue) => {
                                if (newInputValue && !["OAS", "MLP", "KPCL"].includes(newInputValue)) {
                                    setFormData((prev) => ({ ...prev, company: newInputValue }));
                                }
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Select Company*"
                                />
                            )}
                        />

                        <Autocomplete
                            sx={{ flex: 1 }}
                            size="small"
                            options={clients}
                            getOptionLabel={(o) => o ? `${o.name} (${o.phone})` : ""}
                            value={clients.find((o) => o._id === formData.client) || null}
                            onChange={(e, newVal) =>
                                setFormData((prev) => ({ ...prev, client: newVal?._id || "" }))
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Client*" />
                            )}
                        />

                        <IconButton
                            color="primary"
                            sx={{ alignSelf: "center" }}
                            onClick={() => setClientModalOpen(true)}
                        >
                            <AddIcon />
                        </IconButton>
                    </Box>



                    <div className="mb-2">
                        <Typography fontWeight="bold" mx={.5} my={1}>
                            Address
                        </Typography>

                        <Box display="flex" gap={1}>
                            <TextField
                                label="Post Code"
                                size="small"
                                sx={{ width: "30%" }}
                                value={formData.post_code || ""}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        post_code: e.target.value,
                                        address: `${e.target.value}-${prev.full_address || ""}`,
                                    }))
                                }
                            />

                            <TextField
                                label="Full Address"
                                size="small"
                                sx={{ width: "70%" }}
                                value={formData.full_address || ""}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        full_address: e.target.value,
                                        address: `${prev.post_code || ""}-${e.target.value}`,
                                    }))
                                }
                                error={!!errors.address}
                                helperText={errors.address}
                            />
                        </Box>
                    </div>


                    <Box display="flex" gap={1} my={3}>
                        <Autocomplete
                            sx={{ flex: 1 }}
                            size="small"
                            freeSolo
                            options={["Detached", "Semi Detached", "Terrace", "Flat", "Bungalow"]}
                            value={formData.property_type || null}
                            onChange={(e, newVal) => {
                                setFormData((prev) => ({ ...prev, property_type: newVal || "" }));
                            }}
                            onInputChange={(e, newInputValue) => {
                                if (newInputValue && !["Detached", "Semi Detached", "Terrace", "Flat", "Bungalow"].includes(newInputValue)) {
                                    setFormData((prev) => ({ ...prev, property_type: newInputValue }));
                                }
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Property Type"
                                />
                            )}
                        />


                        <Autocomplete
                            sx={{ flex: 1 }}
                            size="small"
                            options={["Ground Floor", "Loft", "First Floor", "Double Storey", "Other"]}
                            value={formData.extention_type || null}
                            onChange={(e, newVal) =>
                                setFormData((prev) => ({ ...prev, extention_type: newVal || "" }))
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Where is this?" />
                            )}
                        />
                    </Box>


                    <Box display="flex" gap={1} my={1}>
                        <Autocomplete
                            sx={{ flex: 1 }}
                            size="small"
                            options={["Yes", "No"]}
                            value={formData.design_prepared || null}
                            onChange={(e, newVal) =>
                                setFormData((prev) => ({ ...prev, design_prepared: newVal || "" }))
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Designs Prepared?" />
                            )}
                        />

                        <Autocomplete
                            sx={{ flex: 1 }}
                            size="small"
                            options={["Yes", "No", "I Don't Know"]}
                            value={formData.building_regulations_drawings || null}
                            onChange={(e, newVal) =>
                                setFormData((prev) => ({ ...prev, building_regulations_drawings: newVal || "" }))
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Regulations Drawings?" />
                            )}
                        />

                        <Autocomplete
                            sx={{ flex: 1 }}
                            size="small"
                            options={["Yes", "No", "I Don't Know", "Under Permitted Development"]}
                            value={formData.planning_permission || null}
                            onChange={(e, newVal) =>
                                setFormData((prev) => ({ ...prev, planning_permission: newVal || "" }))
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Planning Permission?" />
                            )}
                        />
                    </Box>





                    <Box display="flex" gap={1} alignItems="center">
                        <TextField
                            fullWidth
                            label="Budget in £"
                            name="budget"
                            type="number"
                            size="small"
                            margin="normal"
                            value={formData.budget}
                            onChange={handleChange}
                            error={!!errors.budget}
                            helperText={errors.budget}
                        />


                        <Autocomplete
                            fullWidth
                            size="small"
                            options={[
                                "ASAP",
                                "3 Months",
                                "6 Months",
                                "12 Month",
                                "18 Month",
                                "Not Sure",
                            ]}
                            value={formData.when_start || null}
                            onChange={(e, newVal) =>
                                setFormData((prev) => ({ ...prev, when_start: newVal || "" }))
                            }
                            autoHighlight
                            selectOnFocus
                            clearOnBlur
                            handleHomeEndKeys
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="When Start"
                                    margin="normal"
                                    error={!!errors.when_start}
                                    helperText={errors.when_start}
                                />
                            )}
                        />


                        <Autocomplete
                            fullWidth
                            size="small"
                            options={[
                                "Facebook",
                                "LinkedIn",
                                "Instagram",
                                "TikTok",
                                "Telegram",
                                "Referral",
                                "Other",
                            ]}
                            value={formData.source || null}
                            onChange={(e, newVal) =>
                                setFormData((prev) => ({ ...prev, source: newVal || "" }))
                            }
                            autoHighlight
                            selectOnFocus
                            clearOnBlur
                            handleHomeEndKeys
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Source*"
                                    margin="normal"
                                    error={!!errors.source}
                                    helperText={errors.source}
                                />
                            )}
                        />
                    </Box>


                    <TextField
                        fullWidth
                        label="Source URL"
                        name="source_link"
                        size="small"
                        margin="normal"
                        value={formData.source_link}
                        onChange={handleChange}
                        error={!!errors.source_link}
                        helperText={errors.source_link}
                    />


                    <TextField
                        fullWidth
                        label="Project File URL"
                        name="file_link"
                        size="small"
                        margin="normal"
                        value={formData.file_link}
                        onChange={handleChange}
                        error={!!errors.file_link}
                        helperText={errors.file_link}
                    />


                    <TextField
                        fullWidth
                        label="Remark"
                        name="remark"
                        size="small"
                        margin="normal"
                        multiline
                        minRows={4}
                        value={formData.remark}
                        onChange={handleChange}
                    />

                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-[#272e3f]! hover:bg-gray-700! font-bold! mt-4!"
                    >
                        {data ? "Update" : "Create"}
                    </Button>


                </Box>
            </Modal >
            <AddEditClient
                open={clientModalOpen}
                onClose={() => {
                    setClientModalOpen(false);
                    fetchClients();
                }}
                refreshData={fetchClients}
            />
        </>
    );
}
