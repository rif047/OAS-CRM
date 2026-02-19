const Lead = require('./Lead_Model');
const sanitizeHtml = require('sanitize-html');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');




const formatRemark = (oldRemark, newRemark, agentName) => {
    const today = new Date();
    const dateStr = today.toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    if (!newRemark || newRemark.trim() === "") return oldRemark;

    const normalizeLegacyHtml = (html = '') =>
        String(html)
            .replace(/<b><b>/g, '<b>')
            .replace(/<strong><strong>/g, '<strong>');

    const cleanOld = normalizeLegacyHtml(oldRemark || "").trim();
    const cleanNew = normalizeLegacyHtml(newRemark);
    // const cleanNew = newRemark.trim();

    // const header = `${dateStr} - ${agentName}`;
    const header = `<b>${dateStr} - ${agentName}</b>`;


    if (cleanOld && cleanNew.startsWith(cleanOld)) {
        const newOnly = cleanNew.replace(cleanOld, "").trim();
        if (!newOnly) return cleanOld;
        return `${cleanOld}<br><br>${header}<br>${newOnly}`;
    }

    if (cleanNew.startsWith(header)) {
        return cleanOld ? `${cleanOld}<br><br>${cleanNew}` : cleanNew;
    }

    const formattedNew = `${header}<br>${cleanNew}`;
    return cleanOld ? `${cleanOld}<br><br>${formattedNew}` : formattedNew;
};




const sanitizeDescription = (desc) => {
    if (!desc) return '';
    return sanitizeHtml(desc, {
        allowedTags: [
            'p', 'b', 'i', 'u', 'strong', 'em',
            'a', 'ul', 'ol', 'li', 'br', 'span', 'img'
        ],

        allowedAttributes: {
            'a': ['href', 'target', 'rel'],
            'span': ['style'],
            'img': ['src', 'alt', 'title']
        },
        allowedStyles: {
            '*': {
                'color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/],
                'font-weight': [/^bold$/],
                'font-style': [/^italic$/],
                'text-decoration': [/^underline$/]
            }
        },
        allowedSchemes: ['http', 'https', 'mailto']
    });
};


const processDescription = (oldDesc, newDesc, agent, mode = "append") => {
    if (!newDesc || newDesc?.trim() === '') return oldDesc;

    const sanitized = sanitizeDescription(newDesc);

    if (mode === "replace") {
        return sanitized;
    }

    const safeAgent = agent || "System";
    return formatRemark(oldDesc, sanitized, safeAgent);
};

const hasMeaningfulText = (html = '') => {
    return String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() !== '';
};

const LEAD_DESCRIPTION_DIR = path.join(__dirname, '../../Assets/Images/leads_description');
const MAX_COMPRESSED_IMAGE_SIZE = 220 * 1024; // aggressive target ~220KB

const ensureLeadDescriptionDir = () => {
    if (!fs.existsSync(LEAD_DESCRIPTION_DIR)) {
        fs.mkdirSync(LEAD_DESCRIPTION_DIR, { recursive: true });
    }
};

const compressImageToTarget = async (inputBuffer) => {
    const source = sharp(inputBuffer, { failOnError: false }).rotate();
    const metadata = await source.metadata();
    const originalWidth = metadata.width || 1600;

    let width = originalWidth;
    let quality = 72;
    let output = await source.webp({ quality }).toBuffer();

    for (let i = 0; i < 25; i++) {
        let pipeline = sharp(inputBuffer, { failOnError: false }).rotate();
        if (width < originalWidth) {
            pipeline = pipeline.resize({ width, withoutEnlargement: true });
        }

        output = await pipeline.webp({ quality }).toBuffer();
        if (output.length <= MAX_COMPRESSED_IMAGE_SIZE) return output;

        if (quality > 28) {
            quality -= 5;
        } else {
            width = Math.max(280, Math.floor(width * 0.82));
            quality = 52;
        }
    }

    // Last fallback to strictly stay under target when source is very complex.
    while (output.length > MAX_COMPRESSED_IMAGE_SIZE && width > 280) {
        width = Math.max(280, Math.floor(width * 0.78));
        output = await sharp(inputBuffer, { failOnError: false })
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: 34 })
            .toBuffer();
    }

    return output;
};

const UploadDescriptionImages = async (req, res) => {
    try {
        const files = req.files || [];
        if (!files.length) return res.status(400).send('No images uploaded.');
        if (files.length > 10) return res.status(400).send('Maximum 10 images allowed per upload.');

        ensureLeadDescriptionDir();
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        const urls = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const compressed = await compressImageToTarget(file.buffer);
            if (compressed.length > MAX_COMPRESSED_IMAGE_SIZE) {
                return res.status(400).send('Unable to compress image under 220KB. Try a smaller image.');
            }
            const fileName = `lead_desc_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}.webp`;
            const filePath = path.join(LEAD_DESCRIPTION_DIR, fileName);

            fs.writeFileSync(filePath, compressed);
            urls.push(`${baseUrl}/api/Images/leads_description/${fileName}`);
        }

        res.status(200).json({ urls });
    } catch (error) {
        console.error('Lead description image upload failed:', error);
        res.status(500).send('Image upload failed.');
    }
};







const ALLOWED_STATUSES = new Set(['Pending', 'In_Quote', 'In_Survey', 'In_Design', 'In_Review', 'Closed', 'Lost_Lead']);

let Leads = async (req, res) => {
    const { status, company } = req.query;
    const filter = {};

    if (status && ALLOWED_STATUSES.has(status)) {
        filter.status = status;
    }
    if (company && String(company).trim() !== '') {
        filter.company = String(company).trim();
    }

    let Data = await Lead.find(filter)
        .sort({ createdAt: -1 })
        .populate({ path: 'client', select: 'name phone email company', options: { lean: true } })
        .lean();

    res.status(200).json(Data);
};





const Create = async (req, res) => {
    try {
        const { client, agent, address, company, service_type, project_details, project_type, planning_permission, structural_services, interior_design, building_regulation, select_builder, help_project_management, budget, when_to_start, file_link, source, description, stage } = req.body;

        for (let [key, label] of Object.entries({
            company: 'Company',
            client: 'Client',
            source: 'Source',
        })) {
            if (!req.body[key]) return res.status(400).json(`${label} is required!`);
        }

        const generateLeadCode = () => {
            const digits = Math.floor(100 + Math.random() * 900);
            const letters = Array.from({ length: 3 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
            return `${company}-${digits}${letters}`;
        };

        let leadCode;
        while (true) {
            leadCode = generateLeadCode();
            const exists = await Lead.findOne({ leadCode });
            if (!exists) break;
        }

        let newData = new Lead({
            leadCode,
            client,
            agent,
            address,
            company,
            service_type,
            project_details,
            project_type,
            planning_permission,
            structural_services,
            interior_design,
            building_regulation,
            select_builder,
            help_project_management,
            budget,
            when_to_start,
            file_link,
            source,
            stage: "Pending",
            description: processDescription("", description, agent),
            status: 'Pending'
        });

        await newData.save();
        res.status(200).json(newData);

    } catch (error) {
        res.status(500).json('Creation Error!!!');
    }
};






let Update = async (req, res) => {
    try {
        const { client, agent, address, company, service_type, project_details, project_type, planning_permission, structural_services, interior_design, building_regulation, select_builder, help_project_management, budget, when_to_start, file_link, source, description, survey_date, surveyor, designer, design_deadline, stage } = req.body;

        for (let [key, label] of Object.entries({
            company: 'Company',
            client: 'Client',
            source: 'Source',
        })) {
            if (!req.body[key]) return res.status(400).json(`${label} is required!`);
        }

        let updateData = await Lead.findById(req.params.id);
        if (!updateData) { return res.status(404).send('Lead not found'); }

        updateData.client = client;
        updateData.agent = agent;
        updateData.address = address;
        updateData.company = company;
        updateData.service_type = service_type;
        updateData.project_details = project_details;
        updateData.project_type = project_type;
        updateData.planning_permission = planning_permission;
        updateData.structural_services = structural_services;
        updateData.interior_design = interior_design;
        updateData.building_regulation = building_regulation;
        updateData.select_builder = select_builder;
        updateData.help_project_management = help_project_management;
        updateData.budget = budget;
        updateData.when_to_start = when_to_start;
        updateData.file_link = file_link;
        updateData.source = source;
        updateData.survey_date = survey_date;
        updateData.surveyor = surveyor;
        updateData.designer = designer;
        updateData.design_deadline = design_deadline;
        updateData.stage = stage;
        if (description !== undefined && description.trim() !== '') {
            updateData.description = processDescription(updateData.description, description, agent);
        }



        await updateData.save();
        res.status(200).json(updateData);
        console.log('Updated Successfully');

    } catch (error) {
        console.error(error);
        res.status(500).send('Updating Error!!!');
    }
};





let View = async (req, res) => {
    let viewOne = await Lead.findById(req.params.id).populate('client');
    if (!viewOne) return res.status(404).send('Lead not found');
    res.send(viewOne);
};





let Pending = async (req, res) => {
    try {

        let updateData = await Lead.findById(req.params.id);

        if (!updateData) {
            return res.status(404).send('Lead not found');
        }
        updateData.status = 'Pending';

        await updateData.save();
        console.log('Canceled Successfully');
        res.status(200).json(updateData);

    } catch (error) {
        console.error('Error canceling:', error);
        res.status(500).send('Error canceling');
    }
}






let In_Quote = async (req, res) => {
    try {
        const { agent, quote_price, quote_file, description } = req.body;

        if (!quote_price) { return res.status(400).send('Quoted price is required!'); }
        if (!quote_file) { return res.status(400).send('Quote file link is required!'); }

        const updateData = await Lead.findById(req.params.id);
        if (!updateData) return res.status(404).send('Lead not found');

        updateData.agent = agent || updateData.agent;
        updateData.quote_price = quote_price;
        updateData.quote_file = quote_file;
        updateData.stage = "Quote Sent";
        updateData.status = 'In_Quote';
        updateData.in_quote_date = new Date().toISOString().split('T')[0];
        updateData.description = processDescription(updateData.description, description, agent);


        await updateData.save();
        console.log('In_Quote updated successfully');
        res.status(200).json(updateData);
    } catch (error) {
        console.error('Error updating In_Quote:', error);
        res.status(500).send('Updating error!');
    }
};






let Survey_Data = async (req, res) => {
    try {
        const { agent, survey_file, survey_note, survey_done } = req.body;

        let updateData = await Lead.findById(req.params.id);
        if (!updateData) { return res.status(404).send('Lead not found'); }

        updateData.agent = agent;
        updateData.survey_done = survey_done;
        updateData.survey_file = survey_file;
        updateData.survey_note = formatRemark(updateData.survey_note, survey_note, agent);

        await updateData.save();
        res.status(200).json(updateData);
        console.log('Updated Successfully');

    } catch (error) {
        console.error(error);
        res.status(500).send('Updating Error!!!');
    }
}







let In_Survey = async (req, res) => {
    try {
        const { agent, surveyor, survey_date, description } = req.body;

        const requiredFields = {
            agent: 'Agent',
            surveyor: 'Surveyor',
            survey_date: 'Survey Date',
        };

        for (let [key, label] of Object.entries(requiredFields)) { if (!req.body[key]) { return res.status(400).send(`${label} is required!`); } }

        let updateData = await Lead.findById(req.params.id);
        if (!updateData) { return res.status(404).send('Lead not found'); }

        updateData.agent = agent;
        updateData.surveyor = surveyor;
        updateData.survey_date = survey_date;
        updateData.status = 'In_Survey';
        updateData.survey_done = 'No';
        updateData.in_survey_date = new Date().toISOString().split('T')[0];
        updateData.description = processDescription(updateData.description, description, agent);


        await updateData.save();
        res.status(200).json(updateData);
        console.log('Updated Successfully');

    } catch (error) {
        console.error(error);
        res.status(500).send('Updating Error!!!');
    }
}







let In_Design = async (req, res) => {
    try {
        const { agent, designer, design_deadline, description } = req.body;

        const requiredFields = {
            agent: 'Agent',
            design_deadline: 'Project Deadline',
        };

        for (let [key, label] of Object.entries(requiredFields)) { if (!req.body[key]) { return res.status(400).send(`${label} is required!`); } }

        let updateData = await Lead.findById(req.params.id);
        if (!updateData) { return res.status(404).send('Lead not found'); }

        updateData.agent = agent;
        updateData.design_deadline = design_deadline;
        updateData.designer = designer;
        updateData.status = 'In_Design';
        updateData.in_design_date = new Date().toISOString().split('T')[0];
        updateData.description = processDescription(updateData.description, description, agent);


        await updateData.save();
        res.status(200).json(updateData);
        console.log('Updated Successfully');

    } catch (error) {
        console.error(error);
        res.status(500).send('Updating Error!!!');
    }
}





let In_Review = async (req, res) => {
    try {
        const { agent, design_file, description } = req.body;

        const requiredFields = {
            agent: 'Agent',
        };

        for (let [key, label] of Object.entries(requiredFields)) { if (!req.body[key]) { return res.status(400).send(`${label} is required!`); } }

        let updateData = await Lead.findById(req.params.id);
        if (!updateData) { return res.status(404).send('Lead not found'); }

        updateData.agent = agent;
        updateData.status = 'In_Review';
        updateData.design_file = design_file;
        updateData.in_review_date = new Date().toISOString().split('T')[0];
        updateData.description = processDescription(updateData.description, description, agent);


        await updateData.save();
        res.status(200).json(updateData);
        console.log('Updated Successfully');

    } catch (error) {
        console.error(error);
        res.status(500).send('Updating Error!!!');
    }
}






let Closed = async (req, res) => {
    try {
        const { agent, final_price, description } = req.body;

        const requiredFields = {
            agent: 'Agent',
        };

        for (let [key, label] of Object.entries(requiredFields)) { if (!req.body[key]) { return res.status(400).send(`${label} is required!`); } }

        let updateData = await Lead.findById(req.params.id);
        if (!updateData) { return res.status(404).send('Lead not found'); }

        updateData.agent = agent;
        updateData.final_price = final_price;
        updateData.status = 'Closed';
        updateData.close_date = new Date().toISOString().split('T')[0];
        updateData.description = processDescription(updateData.description, description, agent);


        await updateData.save();
        res.status(200).json(updateData);
        console.log('Updated Successfully');

    } catch (error) {
        console.error(error);
        res.status(500).send('Updating Error!!!');
    }
}




let Lost_Lead = async (req, res) => {
    try {
        const { agent, description } = req.body;

        const updateData = await Lead.findById(req.params.id);
        if (!updateData) return res.status(404).send('Lead not found');


        updateData.agent = agent;
        updateData.lost_date = new Date().toISOString().split('T')[0];
        updateData.status = 'Lost_Lead';
        updateData.description = processDescription(updateData.description, description, agent);


        await updateData.save();
        console.log('Lost_Lead updated successfully');
        res.status(200).json(updateData);
    } catch (error) {
        console.error('Error cancelling:', error);
        res.status(500).send('Error cancelling');
    }
};


let Comment = async (req, res) => {
    try {
        const { agent, description } = req.body;

        if (!hasMeaningfulText(description)) {
            return res.status(400).send('Description is required!');
        }

        const updateData = await Lead.findById(req.params.id);
        if (!updateData) return res.status(404).send('Lead not found');

        updateData.agent = agent || updateData.agent;
        updateData.description = processDescription(updateData.description, description, agent);

        await updateData.save();
        res.status(200).json(updateData);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).send('Error adding comment');
    }
};



let Delete = async (req, res) => {
    const deleted = await Lead.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).send('Lead not found');
    res.send('Deleted')
}


module.exports = { Leads, Create, View, Update, Delete, Pending, Closed, Lost_Lead, Comment, UploadDescriptionImages, In_Quote, In_Survey, Survey_Data, In_Design, In_Review };
