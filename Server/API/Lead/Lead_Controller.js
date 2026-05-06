const Lead = require('./Lead_Model');
const sanitizeHtml = require('sanitize-html');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const LONDON_TIME_ZONE = 'Europe/London';

const getLondonDateOnly = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: LONDON_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());

    const mapped = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${mapped.year}-${mapped.month}-${mapped.day}`;
};



const formatRemark = (oldRemark, newRemark, agentName) => {
    const today = new Date();
    const dateStr = today.toLocaleString('en-GB', {
        timeZone: LONDON_TIME_ZONE,
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

const normalizeComparableHtml = (html = '') =>
    String(html)
        .replace(/<b><b>/g, '<b>')
        .replace(/<strong><strong>/g, '<strong>')
        .replace(/\s+/g, ' ')
        .trim();

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
const STATUS_DEFAULT_STAGE = {
    Pending: 'Pending',
    In_Quote: 'Quote Sent',
    In_Survey: 'Under Survey',
    In_Design: 'Drawing',
    In_Review: 'Reviewing',
    Closed: 'Closed',
    Lost_Lead: 'Lost',
};
const STATUS_SORT_FIELD = {
    Pending: 'createdAt',
    In_Quote: 'in_quote_date',
    In_Survey: 'in_survey_date',
    In_Design: 'in_design_date',
    In_Review: 'in_review_date',
    Closed: 'close_date',
    Lost_Lead: 'lost_date',
};

const parseMoney = (value) => {
    const numeric = Number(String(value ?? 0).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
};

const toFixedMoney = (value) => Math.max(0, Number((value || 0).toFixed(2)));

const buildPaymentSummary = (lead) => {
    const quoted = parseMoney(lead.quote_price);
    const activeCycle = Number(lead.payment_cycle || 1);
    const cycleHistory = (lead.payment_history || []).filter((item) => Number(item?.cycle || 1) === activeCycle);
    const received = toFixedMoney(cycleHistory.reduce((sum, item) => sum + parseMoney(item.paid_amount), 0));
    const discount = toFixedMoney(cycleHistory.reduce((sum, item) => sum + parseMoney(item.discount_given), 0));
    const due = toFixedMoney(Math.max(quoted - (received + discount), 0));
    return { quoted, received, discount, due };
};

const applyPaymentSummary = (lead) => {
    const summary = buildPaymentSummary(lead);
    lead.payment_received_total = summary.received;
    lead.payment_discount_total = summary.discount;
    lead.payment_due_amount = summary.due;
    return summary;
};

const buildStageRemark = (stage, note = '') => {
    const safeStage = String(stage || '').trim() || 'Updated';
    return `<p><b>Stage - ${safeStage}</b></p>${note || ''}`;
};

let Leads = async (req, res) => {
    const { status, company } = req.query;
    const filter = {};

    if (status && ALLOWED_STATUSES.has(status)) {
        filter.status = status;
    }
    if (company && String(company).trim() !== '') {
        filter.company = String(company).trim();
    }

    const statusSortField = STATUS_SORT_FIELD[filter.status] || 'createdAt';
    const sortConfig = statusSortField === 'createdAt'
        ? { createdAt: -1, _id: -1 }
        : { [statusSortField]: -1, updatedAt: -1, createdAt: -1, _id: -1 };

    let Data = await Lead.find(filter)
        .sort(sortConfig)
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
        const nextStage = typeof stage === 'string' ? stage.trim() : stage;
        const stageChanged = nextStage !== undefined && nextStage !== updateData.stage;

        if (nextStage !== undefined) {
            updateData.stage = nextStage;
        }

        if (stageChanged) {
            updateData.description = processDescription(
                updateData.description,
                buildStageRemark(nextStage, description || ''),
                agent || updateData.agent
            );
        } else if (description !== undefined && description.trim() !== '') {
            const incomingDescription = sanitizeDescription(description);
            const currentDescription = sanitizeDescription(updateData.description || '');

            // Standard edit flow should update description content directly, not append timeline again.
            if (normalizeComparableHtml(incomingDescription) !== normalizeComparableHtml(currentDescription)) {
                updateData.description = processDescription(updateData.description, description, agent, "replace");
            }
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
        const previousStatus = updateData.status;
        updateData.status = 'Pending';
        updateData.stage = STATUS_DEFAULT_STAGE.Pending;
        let resetNote = '';
        if (previousStatus === 'Closed' || previousStatus === 'Lost_Lead') {
            updateData.payment_cycle = Number(updateData.payment_cycle || 1) + 1;
            updateData.quote_price = '';
            updateData.quote_file = '';
            updateData.final_price = '';
            updateData.payment_received_total = 0;
            updateData.payment_discount_total = 0;
            updateData.payment_due_amount = 0;
            resetNote = `<p><b>Payment reset for re-quotation.</b> New quote cycle: ${updateData.payment_cycle}. Previous payment history kept for audit.</p>`;
        }
        updateData.description = processDescription(
            updateData.description,
            buildStageRemark(updateData.stage, resetNote),
            updateData.agent || "System"
        );

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
        const { agent, quote_price, quote_file, description, initial_payment, discount_given, payment_note } = req.body;

        if (!quote_price) { return res.status(400).send('Quoted price is required!'); }
        if (!quote_file) { return res.status(400).send('Quote file link is required!'); }

        const updateData = await Lead.findById(req.params.id);
        if (!updateData) return res.status(404).send('Lead not found');

        updateData.agent = agent || updateData.agent;
        updateData.quote_price = quote_price;
        updateData.quote_file = quote_file;
        updateData.stage = STATUS_DEFAULT_STAGE.In_Quote;
        updateData.status = 'In_Quote';
        updateData.in_quote_date = getLondonDateOnly();
        const activeCycle = Number(updateData.payment_cycle || 1);
        const reQuoteNote = activeCycle > 1 ? `<p><b>Re-quotation Cycle ${activeCycle}</b></p>` : '';
        updateData.description = processDescription(
            updateData.description,
            buildStageRemark(updateData.stage, `${reQuoteNote}${description || ''}`),
            agent
        );

        const initialPayment = parseMoney(initial_payment);
        const initialDiscount = parseMoney(discount_given);
        const quoted = parseMoney(quote_price);

        if (initialPayment < 0 || initialDiscount < 0) {
            return res.status(400).send('Payment and discount must be positive.');
        }
        if ((initialPayment + initialDiscount) > quoted) {
            return res.status(400).send('Initial payment + discount cannot exceed quoted price.');
        }
        if (initialPayment > 0 || initialDiscount > 0 || String(payment_note || '').trim()) {
            updateData.payment_history = updateData.payment_history || [];
            updateData.payment_history.push({
                paid_amount: initialPayment,
                discount_given: initialDiscount,
                note: String(payment_note || '').trim(),
                paid_at: new Date(),
                agent: agent || updateData.agent || "System",
                stage: updateData.status,
                cycle: Number(updateData.payment_cycle || 1),
            });
        }
        applyPaymentSummary(updateData);


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
        updateData.stage = STATUS_DEFAULT_STAGE.In_Survey;
        updateData.survey_done = 'No';
        updateData.in_survey_date = getLondonDateOnly();
        updateData.description = processDescription(
            updateData.description,
            buildStageRemark(updateData.stage, description || ''),
            agent
        );


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
        updateData.stage = STATUS_DEFAULT_STAGE.In_Design;
        updateData.in_design_date = getLondonDateOnly();
        updateData.description = processDescription(
            updateData.description,
            buildStageRemark(updateData.stage, description || ''),
            agent
        );


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
        updateData.stage = STATUS_DEFAULT_STAGE.In_Review;
        updateData.design_file = design_file;
        updateData.in_review_date = getLondonDateOnly();
        updateData.description = processDescription(
            updateData.description,
            buildStageRemark(updateData.stage, description || ''),
            agent
        );


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
        const { agent, final_price, description, survey_date, surveyor, design_deadline, designer, close_source } = req.body;

        const requiredFields = {
            agent: 'Agent',
        };

        for (let [key, label] of Object.entries(requiredFields)) { if (!req.body[key]) { return res.status(400).send(`${label} is required!`); } }

        let updateData = await Lead.findById(req.params.id);
        if (!updateData) { return res.status(404).send('Lead not found'); }

        updateData.agent = agent;
        updateData.final_price = final_price;
        if (survey_date !== undefined) updateData.survey_date = survey_date;
        if (surveyor !== undefined) updateData.surveyor = surveyor;
        if (design_deadline !== undefined) updateData.design_deadline = design_deadline;
        if (designer !== undefined) updateData.designer = designer;
        updateData.status = 'Closed';
        updateData.stage = STATUS_DEFAULT_STAGE.Closed;
        updateData.close_date = getLondonDateOnly();
        const closeMeta = [];
        if (close_source === 'In_Quote') closeMeta.push('<p><b>Directly closed from In Quote.</b></p>');
        if (survey_date || surveyor || design_deadline || designer) {
            closeMeta.push(
                `<p>Survey Date: ${survey_date || '-'} | Surveyor: ${surveyor || '-'} | Design Deadline: ${design_deadline || '-'} | Architect/Designer: ${designer || '-'}</p>`
            );
        }
        updateData.description = processDescription(
            updateData.description,
            buildStageRemark(updateData.stage, `${closeMeta.join('')}${description || ''}`),
            agent
        );


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
        updateData.lost_date = getLondonDateOnly();
        updateData.status = 'Lost_Lead';
        updateData.stage = STATUS_DEFAULT_STAGE.Lost_Lead;
        updateData.description = processDescription(
            updateData.description,
            buildStageRemark(updateData.stage, description || ''),
            agent
        );


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

let AddPayment = async (req, res) => {
    const { amount, discount_given, note, paid_at, agent } = req.body;
    const updateData = await Lead.findById(req.params.id);
    if (!updateData) return res.status(404).send('Lead not found');

    const paidAmount = parseMoney(amount);
    const discount = parseMoney(discount_given);
    const quoted = parseMoney(updateData.quote_price);

    if (quoted <= 0) return res.status(400).send('Quoted price must be set first.');
    if (paidAmount < 0 || discount < 0) return res.status(400).send('Invalid payment amount.');

    const activeCycle = Number(updateData.payment_cycle || 1);
    const cycleHistory = (updateData.payment_history || []).filter((item) => Number(item?.cycle || 1) === activeCycle);
    const received = toFixedMoney(cycleHistory.reduce((sum, item) => sum + parseMoney(item.paid_amount), 0));
    const discountTotal = toFixedMoney(cycleHistory.reduce((sum, item) => sum + parseMoney(item.discount_given), 0));
    if ((received + discountTotal + paidAmount + discount) > quoted) {
        return res.status(400).send('Payment exceeds quoted price.');
    }

    updateData.payment_history = updateData.payment_history || [];
    updateData.payment_history.push({
        paid_amount: paidAmount,
        discount_given: discount,
        note: String(note || '').trim(),
        paid_at: paid_at ? new Date(paid_at) : new Date(),
        agent: agent || req.username || updateData.agent || "System",
        stage: updateData.status,
        cycle: Number(updateData.payment_cycle || 1),
    });
    applyPaymentSummary(updateData);
    await updateData.save();
    res.status(200).json(updateData);
};

let EditPayment = async (req, res) => {
    const { amount, discount_given, note, paid_at, agent } = req.body;
    const updateData = await Lead.findById(req.params.id);
    if (!updateData) return res.status(404).send('Lead not found');

    const item = (updateData.payment_history || []).id(req.params.paymentId);
    if (!item) return res.status(404).send('Payment history not found');

    const nextAmount = parseMoney(amount);
    const nextDiscount = parseMoney(discount_given);
    if (nextAmount < 0 || nextDiscount < 0) return res.status(400).send('Invalid payment amount.');

    item.paid_amount = nextAmount;
    item.discount_given = nextDiscount;
    item.note = String(note || '').trim();
    item.paid_at = paid_at ? new Date(paid_at) : item.paid_at;
    item.agent = agent || item.agent;

    const summary = buildPaymentSummary(updateData);
    if ((summary.received + summary.discount) > summary.quoted) {
        return res.status(400).send('Payment exceeds quoted price.');
    }
    applyPaymentSummary(updateData);
    await updateData.save();
    res.status(200).json(updateData);
};

let IncomeReport = async (req, res) => {
    if (!['Admin', 'Management'].includes(req.userType)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).send('From and To date are required.');

    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        return res.status(400).send('Invalid date range.');
    }

    const leads = await Lead.find({
        payment_history: {
            $elemMatch: {
                paid_at: { $gte: fromDate, $lte: toDate },
                paid_amount: { $gt: 0 },
            }
        }
    }).populate({ path: 'client', select: 'name phone email company', options: { lean: true } }).lean();

    const rows = [];
    let total = 0;
    for (const lead of leads) {
        for (const item of (lead.payment_history || [])) {
            const paidAt = new Date(item.paid_at);
            if (Number.isNaN(paidAt.getTime())) continue;
            if (paidAt < fromDate || paidAt > toDate) continue;
            const amount = parseMoney(item.paid_amount);
            if (amount <= 0) continue;
            total += amount;
            rows.push({
                lead_id: lead._id,
                code: lead.leadCode,
                client: lead.client || null,
                company: lead.company || '',
                project_address: lead.address || '',
                project_type: lead.project_type || '',
                quoted_amount: toFixedMoney(parseMoney(lead.quote_price)),
                amount: toFixedMoney(amount),
                discount: toFixedMoney(parseMoney(item.discount_given)),
                due: toFixedMoney(parseMoney(lead.payment_due_amount)),
                paid_at: item.paid_at,
                agent: item.agent || '',
            });
        }
    }

    rows.sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
    res.status(200).json({ rows, total: toFixedMoney(total), from, to });
};

let MonthlyReport = async (req, res) => {
    if (!['Admin', 'Management'].includes(req.userType)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { from, to, company, stage } = req.query;
    if (!from || !to) return res.status(400).send('From and To date are required.');

    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        return res.status(400).send('Invalid date range.');
    }
    if (fromDate > toDate) {
        return res.status(400).send('From date cannot be after To date.');
    }

    const baseMatch = {};

    if (company && String(company).trim() && String(company) !== 'All') {
        baseMatch.company = String(company).trim();
    }
    if (stage && String(stage).trim() && String(stage) !== 'All') {
        const normalizedStage = String(stage).trim();
        if (!ALLOWED_STATUSES.has(normalizedStage)) {
            return res.status(400).send('Invalid stage selected.');
        }
        baseMatch.status = normalizedStage;
    }

    const leads = await Lead.aggregate([
        { $match: baseMatch },
        {
            $addFields: {
                _status_date_raw: {
                    $switch: {
                        branches: [
                            { case: { $eq: ['$status', 'In_Quote'] }, then: '$in_quote_date' },
                            { case: { $eq: ['$status', 'In_Survey'] }, then: '$in_survey_date' },
                            { case: { $eq: ['$status', 'In_Design'] }, then: '$in_design_date' },
                            { case: { $eq: ['$status', 'In_Review'] }, then: '$in_review_date' },
                            { case: { $eq: ['$status', 'Closed'] }, then: '$close_date' },
                            { case: { $eq: ['$status', 'Lost_Lead'] }, then: '$lost_date' },
                        ],
                        default: null
                    }
                }
            }
        },
        {
            $match: {
                $expr: {
                    $and: [
                        {
                            $gte: [
                                {
                                    $ifNull: [
                                        {
                                            $dateFromString: {
                                                dateString: '$_status_date_raw',
                                                format: '%Y-%m-%d',
                                                onError: null,
                                                onNull: null
                                            }
                                        },
                                        '$createdAt'
                                    ]
                                },
                                fromDate
                            ]
                        },
                        {
                            $lte: [
                                {
                                    $ifNull: [
                                        {
                                            $dateFromString: {
                                                dateString: '$_status_date_raw',
                                                format: '%Y-%m-%d',
                                                onError: null,
                                                onNull: null
                                            }
                                        },
                                        '$createdAt'
                                    ]
                                },
                                toDate
                            ]
                        }
                    ]
                }
            }
        },
        {
            $addFields: {
                report_date_obj: {
                    $ifNull: [
                        {
                            $dateFromString: {
                                dateString: '$_status_date_raw',
                                format: '%Y-%m-%d',
                                onError: null,
                                onNull: null
                            }
                        },
                        '$createdAt'
                    ]
                }
            }
        },
        { $sort: { createdAt: -1 } },
        {
            $lookup: {
                from: 'clients',
                localField: 'client',
                foreignField: '_id',
                as: 'client'
            }
        },
        {
            $unwind: {
                path: '$client',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                leadCode: 1,
                address: 1,
                company: 1,
                project_type: 1,
                source: 1,
                status: 1,
                stage: 1,
                createdAt: 1,
                updatedAt: 1,
                agent: 1,
                report_date: {
                    $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$report_date_obj',
                        timezone: LONDON_TIME_ZONE
                    }
                },
                in_quote_date: 1,
                in_survey_date: 1,
                in_design_date: 1,
                in_review_date: 1,
                close_date: 1,
                lost_date: 1,
                client: {
                    _id: '$client._id',
                    name: '$client.name',
                    phone: '$client.phone',
                    email: '$client.email',
                    company: '$client.company',
                }
            }
        }
    ]);

    const counts = {
        all: leads.length,
        pending: 0,
        in_quote: 0,
        in_survey: 0,
        in_design: 0,
        in_review: 0,
        closed: 0,
        lost_lead: 0,
    };

    for (const lead of leads) {
        if (lead.status === 'Pending') counts.pending += 1;
        else if (lead.status === 'In_Quote') counts.in_quote += 1;
        else if (lead.status === 'In_Survey') counts.in_survey += 1;
        else if (lead.status === 'In_Design') counts.in_design += 1;
        else if (lead.status === 'In_Review') counts.in_review += 1;
        else if (lead.status === 'Closed') counts.closed += 1;
        else if (lead.status === 'Lost_Lead') counts.lost_lead += 1;
    }

    const companies = await Lead.distinct('company', { company: { $exists: true, $ne: '' } });
    companies.sort((a, b) => String(a).localeCompare(String(b)));

    res.status(200).json({
        rows: leads,
        counts,
        companies,
        filters: {
            from,
            to,
            company: company || 'All',
            stage: stage || 'All',
        },
    });
};

module.exports = { Leads, Create, View, Update, Delete, Pending, Closed, Lost_Lead, Comment, UploadDescriptionImages, In_Quote, In_Survey, Survey_Data, In_Design, In_Review, AddPayment, EditPayment, IncomeReport, MonthlyReport };
