import { useState, useEffect, useRef } from "react";
import { Box, Button, Typography, Modal, IconButton, TextField, Autocomplete, } from "@mui/material";
import { Close as CloseIcon, Add as AddIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import axios from "axios";
import AddEditClient from "../../Client/Add_Edit";
import RichTextEditor from "../../../Components/RichTextEditor";

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


    const startRef = useRef(null);

    const [errors, setErrors] = useState({});
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        client: "",
        address: "",
        company: "",
        property_name: "",
        service_type: "",
        project_details: "",
        project_type: "",
        budget: "",
        when_to_start: "",
        file_link: "",
        source: "",
        description: "",
        survey_date: "",
        surveyor: "",
    });
    const [clientModalOpen, setClientModalOpen] = useState(false);


    const serviceOptions = [
        "Planning Application - Certificate of Lawfulness",
        "Planning Application - Householder Application",
        "Planning Application - Full Planning",
        "Planning Application - Pre-Planning Application",
        "Planning Application - Planning Appeal",
        "Planning Application - HMO",
        "Planning Application - Flat Conversion",
        "Planning Application - New Build",
        "Planning Application - Retrospective Planning Permission",

        "Interior Design - 2D Design",
        "Interior Design - 3D Design",

        "Exterior Design - 2D Design",
        "Exterior Design - 3D Design",

        "Structural Services - Structural Calculation",
        "Structural Services - Structural Survey",
        "Structural Services - Structural Report",

        "Building Regulation - Building Regulation",
        "Building Regulation - Drawings",
        "Building Regulation - Build Over Agreement",

        "Party Wall Services - Party Wall Notice",
        "Party Wall Services - Party Wall Survey",

        "Estate Floor Plan"
    ];


    const projectOptions = [
        "Residential - Extension",
        "Residential - Loft",
        "Residential - Garage Conversion",
        "Residential - Outhouse",
        "Residential - Porch",
        "Residential - Flat Conversion",
        "Residential - HMO",
        "Residential - Lease Plan",
        "Residential - Floor Plan",
        "Residential - Existing Drawing",
        "Residential - Proposed",
        "Residential - Structural Survey",
        "Residential - Structural Report",
        "Residential - Structural Calculation",
        "Residential - Building Regulation Drawing",
        "Residential - Build Over Agreement",
        "Residential - Party Wall Notice",
        "Residential - Party Wall Survey",
        "Residential - Interior",
        "Residential - Exterior",
        "Residential - Internal Project",
        "Residential - Change Of Use Application",
        "Residential - Others",

        "Commercial - Extension",
        "Commercial - Loft",
        "Commercial - Garage Conversion",
        "Commercial - Outhouse",
        "Commercial - Porch",
        "Commercial - Flat Conversion",
        "Commercial - HMO",
        "Commercial - Lease Plan",
        "Commercial - Floor Plan",
        "Commercial - Existing Drawing",
        "Commercial - Proposed",
        "Commercial - Structural Survey",
        "Commercial - Structural Report",
        "Commercial - Structural Calculation",
        "Commercial - Building Regulation Drawing",
        "Commercial - Build Over Agreement",
        "Commercial - Party Wall Notice",
        "Commercial - Party Wall Survey",
        "Commercial - Interior",
        "Commercial - Exterior",
        "Commercial - Internal Project",
        "Commercial - Change of Use Application",
        "Commercial - Others",
    ];




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
                        mb={3}
                        py={1}
                        sx={{ position: 'sticky', top: 0, backgroundColor: '#fdfdfd', zIndex: 10, borderBottom: '1px solid #ddd' }}
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
                            disabled
                            autoHighlight
                            selectOnFocus
                            clearOnBlur
                            handleHomeEndKeys
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
                            disabled
                            autoHighlight
                            selectOnFocus
                            clearOnBlur
                            handleHomeEndKeys
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
                                    label="Select Client*"
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
                            Project Address
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
                                label="Full Project Address"
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
                        <Autocomplete
                            autoHighlight
                            selectOnFocus
                            clearOnBlur
                            handleHomeEndKeys
                            sx={{ flex: 10 }}
                            size="small"
                            options={serviceOptions}
                            value={formData.service_type || null}
                            onChange={(e, newVal) => {
                                setFormData((prev) => ({ ...prev, service_type: newVal || "" }));
                            }}
                            renderInput={(params) => (
                                <TextField {...params} label="Service Type" />
                            )}
                            freeSolo
                            onInputChange={(e, newInputValue) => {
                                if (newInputValue && !serviceOptions.includes(newInputValue)) {
                                    setFormData((prev) => ({ ...prev, service_type: newInputValue }));
                                }
                            }}
                        />



                        <Autocomplete
                            autoHighlight
                            selectOnFocus
                            clearOnBlur
                            handleHomeEndKeys
                            sx={{ flex: 10 }}
                            size="small"
                            options={projectOptions}
                            value={formData.project_type || null}
                            onChange={(e, newVal) => {
                                setFormData(prev => ({ ...prev, project_type: newVal || "" }));
                            }}
                            renderInput={(params) => (
                                <TextField {...params} label="Project Type" />
                            )}
                            freeSolo
                            onInputChange={(e, newInputValue) => {
                                if (newInputValue && !projectOptions.includes(newInputValue)) {
                                    setFormData(prev => ({ ...prev, project_type: newInputValue }));
                                }
                            }}
                        />

                    </Box>




                    <TextField
                        fullWidth
                        label="Write Project Details"
                        name="project_details"
                        size="small"
                        margin="normal"
                        multiline
                        minRows={2}
                        value={formData.project_details}
                        onChange={handleChange}
                    />

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Survey Date*
                        </label>
                        <input
                            ref={startRef}
                            type="date"
                            value={formData.survey_date || ""}
                            onChange={e => setFormData(prev => ({ ...prev, survey_date: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#4ea863] focus:border-transparent text-sm cursor-pointer"
                        />
                    </div>



                    <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        name="surveyor"
                        label="Surveyor*"
                        value={formData.surveyor}
                        onChange={handleChange}
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


                    <RichTextEditor
                        value={formData.description}
                        onChange={(html) =>
                            setFormData(prev => ({ ...prev, description: html }))
                        }
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
