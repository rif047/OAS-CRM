import { useState, useEffect } from "react";
import { Box, Button, Typography, Modal, IconButton, TextField, Autocomplete } from "@mui/material";
import { Close as CloseIcon, Add as AddIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import axios from "axios";
import AddEditClient from "../../Client/Add_Edit";

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
        project_type: "",
        description: "",
    });

    const [clientModalOpen, setClientModalOpen] = useState(false);
    const [newRemark, setNewRemark] = useState("");

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

            setNewRemark("");

        } else {
            setFormData({ agent: loggedUser?.name || '' });
            setNewRemark("");
        }

        setErrors({});
        fetchClients();
    }, [data]);

    const validate = () => {
        const newErrors = {};
        if (!formData.client) newErrors.client = "Client is required.";
        if (!formData.company) newErrors.company = "Company is required.";
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
            let updatedDescription = formData.description || "";

            if (newRemark.trim()) {
                if (updatedDescription) {
                    updatedDescription = updatedDescription + "\n" + newRemark.trim();
                } else {
                    updatedDescription = newRemark.trim();
                }
            }

            const finalData = {
                ...formData,
                description: updatedDescription
            };

            const url = `${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}${data?._id ? `/${data._id}` : ""}`;
            const method = data?._id ? "patch" : "post";

            await axios[method](url, finalData, {
                headers: { "Content-Type": "application/json" }
            });

            toast.success(data?._id ? "Updated successfully." : "Created successfully.");
            refreshData();
            onClose();
        } catch (error) {
            toast.error(error.response?.data || "Failed to submit data.");
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
                        mb={3}
                        py={1}
                        sx={{
                            position: 'sticky',
                            top: 0,
                            backgroundColor: '#fdfdfd',
                            zIndex: 10,
                            borderBottom: '1px solid #ddd'
                        }}
                    >
                        <Typography className='font-bold!' variant="h6">
                            {data ? 'Update Data' : 'Create New'}
                        </Typography>
                        <IconButton onClick={onClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    <Box display="flex" gap={1} alignItems="center" className='pb-2!'>
                        <Autocomplete
                            sx={{ flex: 1 }}
                            size="small"
                            freeSolo
                            options={["OAS", "MLP", "KPCL", "TLPS", "KPCL BD"]}
                            value={formData.company || null}
                            onChange={(e, newVal) =>
                                setFormData(prev => ({ ...prev, company: newVal || "" }))
                            }
                            onInputChange={(e, newInputValue) => {
                                if (newInputValue && !["OAS", "MLP", "KPCL", "TLPS", "KPCL BD"].includes(newInputValue)) {
                                    setFormData(prev => ({ ...prev, company: newInputValue }));
                                }
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Select Company*"
                                    error={!!errors.company}
                                    helperText={errors.company}
                                />
                            )}
                        />

                        <Autocomplete
                            sx={{ flex: 1 }}
                            size="small"
                            options={clients}
                            getOptionLabel={(o) => o ? `${o.name} (${o.phone})` : ""}
                            value={clients.find(o => o._id === formData.client) || null}
                            onChange={(e, newVal) =>
                                setFormData(prev => ({ ...prev, client: newVal?._id || "" }))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Client*"
                                    error={!!errors.client}
                                    helperText={errors.client}
                                />
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

                    <div className="border border-gray-300 pb-4 pt-1 px-3 mt-2 rounded-sm">
                        <Typography fontWeight="bold" mx={.5} my={1} className="text-gray-600">
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

                    <Box display="flex" gap={1} mt={2} alignItems="center">
                        <TextField
                            sx={{ flex: 8 }}
                            label="Project Type"
                            name="project_type"
                            size="small"
                            value={formData.project_type}
                            onChange={handleChange}
                            error={!!errors.project_type}
                            helperText={errors.project_type}
                        />

                        <Autocomplete
                            sx={{ flex: 10 }}
                            size="small"
                            options={["Detached", "Semi Detached", "Terrace", "Flat", "Bungalow"]}
                            value={formData.property_type || null}
                            onChange={(e, newVal) => {
                                setFormData((prev) => ({ ...prev, property_type: newVal || "" }));
                            }}
                            renderInput={(params) => (
                                <TextField {...params} label="Property Type" />
                            )}
                            freeSolo
                            onInputChange={(e, newInputValue) => {
                                if (
                                    newInputValue &&
                                    !["Detached", "Semi Detached", "Terrace", "Flat", "Bungalow"]
                                        .includes(newInputValue)
                                ) {
                                    setFormData((prev) => ({ ...prev, property_type: newInputValue }));
                                }
                            }}
                        />
                    </Box>

                    <TextField
                        fullWidth
                        label="Scope Of Work"
                        name="extention_type"
                        size="small"
                        margin="normal"
                        value={formData.extention_type}
                        onChange={handleChange}
                        error={!!errors.extention_type}
                        helperText={errors.extention_type}
                    />

                    <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        label="Previous Remarks"
                        value={formData.description || ""}
                        disabled
                        hidden
                        multiline
                        minRows={3}
                        InputProps={{
                            style: {
                                backgroundColor: '#f5f5f5',
                                color: '#666'
                            }
                        }}
                    />

                    <TextField
                        fullWidth
                        label="Add New Remark"
                        size="small"
                        margin="normal"
                        multiline
                        minRows={8}
                        value={newRemark}
                        onChange={e => setNewRemark(e.target.value)}
                        placeholder="Enter new remark here..."
                        helperText="This will be appended to previous remarks"
                    />

                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-[#272e3f]! hover:bg-gray-700! font-bold! mt-4!"
                    >
                        {loading ? "Processing..." : (data ? "Update" : "Create")}
                    </Button>
                </Box>
            </Modal>

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