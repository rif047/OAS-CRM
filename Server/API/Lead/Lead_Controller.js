const Lead = require('./Lead_Model');
const Client = require('../Client/Client_Model');
const User = require('../User/User_Model');
const { resolveAssignedCompaniesForRequest, buildCompanyMatch, enforceCompanyInAllowedList } = require('../../Utils/CompanyAccess');
const sanitizeHtml = require('sanitize-html');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { handleControllerError } = require('../../Utils/ControllerError');

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

const asStringOrEmpty = (value) => (typeof value === 'string' ? value : '');
const splitSurveyorNames = (value) =>
    String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const normalizeSurveyor = (value) => {
    if (Array.isArray(value)) {
        const unique = [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
        return unique.join(', ');
    }
    if (typeof value === 'string') {
        const unique = [...new Set(splitSurveyorNames(value))];
        return unique.join(', ');
    }
    return '';
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

    const nextRemark = asStringOrEmpty(newRemark);
    if (!nextRemark.trim()) return oldRemark;

    const normalizeLegacyHtml = (html = '') =>
        String(html)
            .replace(/<b><b>/g, '<b>')
            .replace(/<strong><strong>/g, '<strong>');

    const cleanOld = normalizeLegacyHtml(oldRemark || "").trim();
    const cleanNew = normalizeLegacyHtml(nextRemark);
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
    const safeDesc = asStringOrEmpty(desc);
    if (!safeDesc) return '';
    return sanitizeHtml(safeDesc, {
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
    const nextDescription = asStringOrEmpty(newDesc);
    if (!nextDescription.trim()) return oldDesc;

    const sanitized = sanitizeDescription(nextDescription);

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
    if (typeof html !== 'string') return false;
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
        return handleControllerError(res, error, 'Image upload failed.');
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

const LEAD_LIST_LIGHT_PROJECTION = '-description -survey_note -project_details -payment_history';
const LEAD_DASHBOARD_PROJECTION = {
    _id: 1,
    leadCode: 1,
    company: 1,
    status: 1,
    quote_price: 1,
    payment_due_amount: 1,
    in_quote_date: 1,
    close_date: 1,
    lost_date: 1,
    survey_date: 1,
    design_deadline: 1,
    createdAt: 1,
    updatedAt: 1,
    'payment_history.paid_amount': 1,
    'payment_history.paid_at': 1,
};
const LEAD_LIST_SORT_FIELDS = new Set([
    'createdAt',
    'updatedAt',
    'leadCode',
    'company',
    'status',
    'stage',
    'in_quote_date',
    'in_survey_date',
    'in_design_date',
    'in_review_date',
    'close_date',
    'lost_date',
]);
const DASHBOARD_STATUSES = ['Pending', 'In_Quote', 'In_Survey', 'In_Design', 'In_Review', 'Closed', 'Lost_Lead'];

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseMoney = (value) => {
    const numeric = Number(String(value ?? 0).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
};

const parseLeadDate = (value) => {
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getLondonMonthKey = (value) => {
    const date = parseLeadDate(value);
    if (!date) return '';
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: LONDON_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
    }).formatToParts(date);
    const mapped = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${mapped.year}-${mapped.month}`;
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

const getLeadScope = async (req) => {
    const allowedCompanies = await resolveAssignedCompaniesForRequest(req);
    const companyScope = req.userType === 'Admin' ? {} : buildCompanyMatch('company', allowedCompanies);
    return { allowedCompanies, companyScope };
};

const findScopedLeadById = async (req, id) => {
    const { companyScope } = await getLeadScope(req);
    return Lead.findOne({ _id: id, ...companyScope });
};

let Leads = async (req, res) => {
    const { status, company, page: rawPage, limit: rawLimit, sortBy: rawSortBy, sortDir: rawSortDir, search: rawSearch } = req.query;
    const isDashboardRequest = String(req.query.dashboard || '').trim() === '1';
    const { allowedCompanies, companyScope } = await getLeadScope(req);
    const filter = { ...companyScope };

    if (status && ALLOWED_STATUSES.has(status)) {
        filter.status = status;
    }
    if (company && String(company).trim() !== '') {
        filter.company = String(company).trim();
    }

    const search = String(rawSearch || '').trim();
    const containsRegex = search ? new RegExp(escapeRegex(search), 'i') : null;

    const requestedSortBy = String(rawSortBy || '').trim();
    const resolvedSortField = LEAD_LIST_SORT_FIELDS.has(requestedSortBy)
        ? requestedSortBy
        : (STATUS_SORT_FIELD[filter.status] || 'createdAt');
    const requestedSortDir = String(rawSortDir || '').toLowerCase() === 'asc' ? 1 : -1;
    const sortConfig = resolvedSortField === 'createdAt'
        ? { createdAt: requestedSortDir, _id: requestedSortDir }
        : { [resolvedSortField]: requestedSortDir, updatedAt: -1, createdAt: -1, _id: -1 };

    const hasPagination = rawPage !== undefined || rawLimit !== undefined;
    if (!hasPagination) {
        if (isDashboardRequest && !containsRegex) {
            const Data = await Lead.find(filter)
                .select(LEAD_DASHBOARD_PROJECTION)
                .sort(sortConfig)
                .populate({ path: 'client', select: 'name', options: { lean: true } })
                .lean();
            return res.status(200).json(Data);
        }

        if (!containsRegex) {
            const Data = await Lead.find(filter)
                .sort(sortConfig)
                .populate({ path: 'client', select: 'name phone email company', options: { lean: true } })
                .lean();
            return res.status(200).json(Data);
        }

        const nonSearchFilter = { ...filter };
        delete nonSearchFilter.$or;
        const Data = await Lead.aggregate([
            { $match: nonSearchFilter },
            {
                $addFields: {
                    _clientObjectId: {
                        $convert: {
                            input: '$client',
                            to: 'objectId',
                            onError: null,
                            onNull: null,
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'clients',
                    localField: '_clientObjectId',
                    foreignField: '_id',
                    as: 'client',
                }
            },
            {
                $unwind: {
                    path: '$client',
                    preserveNullAndEmptyArrays: true,
                }
            },
            {
                $match: {
                    $or: [
                        { leadCode: containsRegex },
                        { company: containsRegex },
                        { address: containsRegex },
                        { project_type: containsRegex },
                        { source: containsRegex },
                        { stage: containsRegex },
                        { status: containsRegex },
                        { 'client.name': containsRegex },
                        { 'client.phone': containsRegex },
                        { 'client.email': containsRegex },
                        { 'client.company': containsRegex },
                    ],
                }
            },
            { $sort: sortConfig },
        ]);
        return res.status(200).json(Data);
    }

    const page = parsePositiveInt(rawPage, 1);
    const limit = Math.min(200, parsePositiveInt(rawLimit, 10));
    const skip = (page - 1) * limit;
    const companyFilterForDistinct = { ...companyScope };
    if (filter.status) companyFilterForDistinct.status = filter.status;

    const queryWithoutSearch = { ...filter };
    delete queryWithoutSearch.$or;

    const rowsPromise = !containsRegex
        ? Lead.find(filter)
            .select(LEAD_LIST_LIGHT_PROJECTION)
            .sort(sortConfig)
            .skip(skip)
            .limit(limit)
            .populate({ path: 'client', select: 'name phone email company', options: { lean: true } })
            .lean()
        : Lead.aggregate([
            { $match: queryWithoutSearch },
            {
                $addFields: {
                    _clientObjectId: {
                        $convert: {
                            input: '$client',
                            to: 'objectId',
                            onError: null,
                            onNull: null,
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'clients',
                    localField: '_clientObjectId',
                    foreignField: '_id',
                    as: 'client',
                }
            },
            {
                $unwind: {
                    path: '$client',
                    preserveNullAndEmptyArrays: true,
                }
            },
            {
                $match: {
                    $or: [
                        { leadCode: containsRegex },
                        { company: containsRegex },
                        { address: containsRegex },
                        { project_type: containsRegex },
                        { source: containsRegex },
                        { stage: containsRegex },
                        { status: containsRegex },
                        { 'client.name': containsRegex },
                        { 'client.phone': containsRegex },
                        { 'client.email': containsRegex },
                        { 'client.company': containsRegex },
                    ],
                }
            },
            { $sort: sortConfig },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    _id: 1,
                    leadCode: 1,
                    company: 1,
                    address: 1,
                    source: 1,
                    stage: 1,
                    status: 1,
                    quote_price: 1,
                    final_price: 1,
                    survey_date: 1,
                    surveyor: 1,
                    survey_done: 1,
                    survey_file: 1,
                    in_quote_date: 1,
                    in_survey_date: 1,
                    in_design_date: 1,
                    in_review_date: 1,
                    close_date: 1,
                    lost_date: 1,
                    design_deadline: 1,
                    designer: 1,
                    design_file: 1,
                    payment_due_amount: 1,
                    payment_received_total: 1,
                    payment_discount_total: 1,
                    payment_history: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    client: {
                        _id: '$client._id',
                        name: '$client.name',
                        phone: '$client.phone',
                        email: '$client.email',
                        company: '$client.company',
                    },
                }
            },
        ]);

    const totalPromise = !containsRegex
        ? Lead.countDocuments(filter)
        : Lead.aggregate([
            { $match: queryWithoutSearch },
            {
                $addFields: {
                    _clientObjectId: {
                        $convert: {
                            input: '$client',
                            to: 'objectId',
                            onError: null,
                            onNull: null,
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'clients',
                    localField: '_clientObjectId',
                    foreignField: '_id',
                    as: 'client',
                }
            },
            {
                $unwind: {
                    path: '$client',
                    preserveNullAndEmptyArrays: true,
                }
            },
            {
                $match: {
                    $or: [
                        { leadCode: containsRegex },
                        { company: containsRegex },
                        { address: containsRegex },
                        { project_type: containsRegex },
                        { source: containsRegex },
                        { stage: containsRegex },
                        { status: containsRegex },
                        { 'client.name': containsRegex },
                        { 'client.phone': containsRegex },
                        { 'client.email': containsRegex },
                        { 'client.company': containsRegex },
                    ],
                }
            },
            { $count: 'total' },
        ]).then((result) => Number(result?.[0]?.total || 0));

    const [rows, total, companies] = await Promise.all([
        rowsPromise,
        totalPromise,
        Lead.distinct('company', companyFilterForDistinct),
    ]);

    const safeCompanies = companies.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return res.status(200).json({
        rows,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        companies: safeCompanies,
        sortBy: resolvedSortField,
        sortDir: requestedSortDir === 1 ? 'asc' : 'desc',
        search,
    });
};





const Create = async (req, res) => {
    try {
        const { client, agent, address, company, service_type, project_details, project_type, planning_permission, structural_services, interior_design, building_regulation, select_builder, help_project_management, budget, when_to_start, file_link, source, description, stage } = req.body;
        const { allowedCompanies } = await getLeadScope(req);
        const scopedCompany = enforceCompanyInAllowedList(company, allowedCompanies);

        for (let [key, label] of Object.entries({
            company: 'Company',
            client: 'Client',
            source: 'Source',
        })) {
            if (!req.body[key]) return res.status(400).json(`${label} is required!`);
        }
        if (!scopedCompany) return res.status(403).send('You do not have access to this company.');
        const scopedClient = await Client.findOne({
            _id: client,
            ...(req.userType === 'Admin' ? {} : buildCompanyMatch('access_company', allowedCompanies)),
        }).select('_id');
        if (!scopedClient) return res.status(403).send('Selected client is outside your company access.');

        const generateLeadCode = () => {
            const digits = Math.floor(100 + Math.random() * 900);
            const letters = Array.from({ length: 3 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
            return `${scopedCompany}-${digits}${letters}`;
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
            company: scopedCompany,
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
        console.error(error);
        return handleControllerError(res, error, 'Creation Error!!!');
    }
};






let Update = async (req, res) => {
    try {
        const { client, agent, address, company, service_type, project_details, project_type, planning_permission, structural_services, interior_design, building_regulation, select_builder, help_project_management, budget, when_to_start, file_link, source, description, survey_date, surveyor, designer, design_deadline, stage } = req.body;
        const { allowedCompanies } = await getLeadScope(req);
        const scopedCompany = enforceCompanyInAllowedList(company, allowedCompanies);

        for (let [key, label] of Object.entries({
            company: 'Company',
            client: 'Client',
            source: 'Source',
        })) {
            if (!req.body[key]) return res.status(400).json(`${label} is required!`);
        }
        if (!scopedCompany) return res.status(403).send('You do not have access to this company.');
        const scopedClient = await Client.findOne({
            _id: client,
            ...(req.userType === 'Admin' ? {} : buildCompanyMatch('access_company', allowedCompanies)),
        }).select('_id');
        if (!scopedClient) return res.status(403).send('Selected client is outside your company access.');

        let updateData = await findScopedLeadById(req, req.params.id);
        if (!updateData) { return res.status(404).send('Lead not found'); }

        updateData.client = client;
        updateData.agent = agent;
        updateData.address = address;
        updateData.company = scopedCompany;
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
        updateData.surveyor = normalizeSurveyor(surveyor);
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
        return handleControllerError(res, error, 'Updating Error!!!');
    }
};





let View = async (req, res) => {
    const { companyScope } = await getLeadScope(req);
    let viewOne = await Lead.findOne({ _id: req.params.id, ...companyScope }).populate('client');
    if (!viewOne) return res.status(404).send('Lead not found');
    res.send(viewOne);
};





let Pending = async (req, res) => {
    try {

        let updateData = await findScopedLeadById(req, req.params.id);

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
        return handleControllerError(res, error, 'Error canceling');
    }
}






let In_Quote = async (req, res) => {
    try {
        const { agent, quote_price, quote_file, description, initial_payment, discount_given, payment_note } = req.body;

        if (!quote_price) { return res.status(400).send('Quoted price is required!'); }
        if (!quote_file) { return res.status(400).send('Quote file link is required!'); }

        const updateData = await findScopedLeadById(req, req.params.id);
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
        return handleControllerError(res, error, 'Updating error!');
    }
};






let Survey_Data = async (req, res) => {
    try {
        const { agent, survey_file, survey_note, survey_done } = req.body;

        let updateData = await findScopedLeadById(req, req.params.id);
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
        return handleControllerError(res, error, 'Updating Error!!!');
    }
}







let In_Survey = async (req, res) => {
    try {
        const { agent, surveyor, survey_date, description } = req.body;
        const normalizedSurveyor = normalizeSurveyor(surveyor);

        const requiredFields = {
            agent: 'Agent',
            survey_date: 'Survey Date',
        };

        for (let [key, label] of Object.entries(requiredFields)) { if (!req.body[key]) { return res.status(400).send(`${label} is required!`); } }
        if (!normalizedSurveyor) return res.status(400).send('Surveyor is required!');

        let updateData = await findScopedLeadById(req, req.params.id);
        if (!updateData) { return res.status(404).send('Lead not found'); }

        updateData.agent = agent;
        updateData.surveyor = normalizedSurveyor;
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
        return handleControllerError(res, error, 'Updating Error!!!');
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

        let updateData = await findScopedLeadById(req, req.params.id);
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
        return handleControllerError(res, error, 'Updating Error!!!');
    }
}





let In_Review = async (req, res) => {
    try {
        const { agent, design_file, description } = req.body;

        const requiredFields = {
            agent: 'Agent',
        };

        for (let [key, label] of Object.entries(requiredFields)) { if (!req.body[key]) { return res.status(400).send(`${label} is required!`); } }

        let updateData = await findScopedLeadById(req, req.params.id);
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
        return handleControllerError(res, error, 'Updating Error!!!');
    }
}






let Closed = async (req, res) => {
    try {
        const { agent, final_price, description, survey_date, surveyor, design_deadline, designer, close_source } = req.body;

        const requiredFields = {
            agent: 'Agent',
        };

        for (let [key, label] of Object.entries(requiredFields)) { if (!req.body[key]) { return res.status(400).send(`${label} is required!`); } }

        let updateData = await findScopedLeadById(req, req.params.id);
        if (!updateData) { return res.status(404).send('Lead not found'); }

        updateData.agent = agent;
        updateData.final_price = final_price;
        if (survey_date !== undefined) updateData.survey_date = survey_date;
        if (surveyor !== undefined) updateData.surveyor = normalizeSurveyor(surveyor);
        if (design_deadline !== undefined) updateData.design_deadline = design_deadline;
        if (designer !== undefined) updateData.designer = designer;
        updateData.status = 'Closed';
        updateData.stage = STATUS_DEFAULT_STAGE.Closed;
        updateData.close_date = getLondonDateOnly();
        const closeMeta = [];
        if (close_source === 'In_Quote') closeMeta.push('<p><b>Directly closed from In Quote.</b></p>');
        if (survey_date || surveyor || design_deadline || designer) {
            closeMeta.push(
                `<p>Survey Date: ${survey_date || '-'} | Surveyor: ${normalizeSurveyor(surveyor) || '-'} | Design Deadline: ${design_deadline || '-'} | Architect/Designer: ${designer || '-'}</p>`
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
        return handleControllerError(res, error, 'Updating Error!!!');
    }
}




let Lost_Lead = async (req, res) => {
    try {
        const { agent, description } = req.body;

        const updateData = await findScopedLeadById(req, req.params.id);
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
        return handleControllerError(res, error, 'Error cancelling');
    }
};


let Comment = async (req, res) => {
    try {
        const { agent, description } = req.body;

        if (!hasMeaningfulText(description)) {
            return res.status(400).send('Description is required!');
        }

        const updateData = await findScopedLeadById(req, req.params.id);
        if (!updateData) return res.status(404).send('Lead not found');

        updateData.agent = agent || updateData.agent;
        updateData.description = processDescription(updateData.description, description, agent);

        await updateData.save();
        res.status(200).json(updateData);
    } catch (error) {
        console.error('Error adding comment:', error);
        return handleControllerError(res, error, 'Error adding comment');
    }
};



let Delete = async (req, res) => {
    const { companyScope } = await getLeadScope(req);
    const deleted = await Lead.findOneAndDelete({ _id: req.params.id, ...companyScope });
    if (!deleted) return res.status(404).send('Lead not found');
    res.send('Deleted')
}

let AddPayment = async (req, res) => {
    const { amount, discount_given, note, paid_at, agent } = req.body;
    const updateData = await findScopedLeadById(req, req.params.id);
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
    const updateData = await findScopedLeadById(req, req.params.id);
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

let SurveyorDashboard = async (req, res) => {
    if (!['Admin', 'Management', 'Surveyor'].includes(req.userType)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const surveyorNameRaw = String(req.query?.surveyor || '').trim();
    const identityCandidates = [
        String(req.name || '').trim(),
        String(req.username || '').trim(),
    ].filter(Boolean);

    const { companyScope } = await getLeadScope(req);
    const baseMatch = { surveyor: { $exists: true, $ne: '' }, ...companyScope };
    if (req.userType === 'Surveyor') {
        if (!identityCandidates.length) {
            return res.status(400).json({ error: 'Surveyor identity not found.' });
        }
        baseMatch.$or = identityCandidates.map((value) => ({
            surveyor: { $regex: `(^|,\\s*)${escapeRegex(value)}(\\s*,|$)`, $options: 'i' }
        }));
    } else if (surveyorNameRaw) {
        baseMatch.surveyor = { $regex: `(^|,\\s*)${escapeRegex(surveyorNameRaw)}(\\s*,|$)`, $options: 'i' };
    }

    const leads = await Lead.find(baseMatch)
        .select('leadCode company status stage surveyor survey_date survey_done in_survey_date createdAt updatedAt')
        .populate({ path: 'client', select: 'name phone email company', options: { lean: true } })
        .lean();

    const londonTodayRaw = getLondonDateOnly();
    const londonToday = parseLeadDate(londonTodayRaw);
    const londonMonthKey = getLondonMonthKey(londonTodayRaw);

    const toDaysLeft = (value) => {
        const date = parseLeadDate(value);
        if (!date || !londonToday) return null;
        const start = new Date(londonToday);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setUTCHours(0, 0, 0, 0);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    };

    const statusBreakdownMap = {
        Pending: 0,
        In_Quote: 0,
        In_Survey: 0,
        In_Design: 0,
        In_Review: 0,
        Closed: 0,
        Lost_Lead: 0,
    };

    let inSurveyNow = 0;
    let doneOverall = 0;
    let dueToday = 0;
    let overdue = 0;
    let scheduledThisMonth = 0;
    let completedThisMonth = 0;

    const upcomingSchedule = [];
    const recentUpdates = [...leads].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 10);

    for (const lead of leads) {
        if (statusBreakdownMap[lead.status] !== undefined) {
            statusBreakdownMap[lead.status] += 1;
        }

        if (lead.status === 'In_Survey') inSurveyNow += 1;

        const isDone = String(lead.survey_done || '').toLowerCase() === 'yes';
        if (isDone) doneOverall += 1;

        const surveyDate = parseLeadDate(lead.survey_date);
        const daysLeft = toDaysLeft(lead.survey_date);

        if (surveyDate && getLondonMonthKey(surveyDate) === londonMonthKey) {
            scheduledThisMonth += 1;
        }

        if (isDone && getLondonMonthKey(lead.updatedAt) === londonMonthKey) {
            completedThisMonth += 1;
        }

        if (daysLeft === 0 && !isDone) dueToday += 1;
        if (daysLeft !== null && daysLeft < 0 && !isDone) overdue += 1;

        if (surveyDate && !isDone) {
            upcomingSchedule.push({
                _id: lead._id,
                leadCode: lead.leadCode,
                client: lead.client || null,
                company: lead.company || '',
                surveyor: lead.surveyor || '',
                survey_date: lead.survey_date || '',
                status: lead.status || '',
                survey_done: lead.survey_done || 'No',
                dueInDays: daysLeft,
            });
        }
    }

    upcomingSchedule.sort((a, b) => (parseLeadDate(a.survey_date) - parseLeadDate(b.survey_date)));

    const statusBreakdown = Object.entries(statusBreakdownMap).map(([status, count]) => ({ status, count }));

    const resolvedSurveyor = req.userType === 'Surveyor'
        ? (identityCandidates[0] || '')
        : surveyorNameRaw;

    return res.status(200).json({
        summary: {
            totalAssigned: leads.length,
            inSurveyNow,
            doneOverall,
            dueToday,
            overdue,
            scheduledThisMonth,
            completedThisMonth,
        },
        statusBreakdown,
        upcomingSchedule: upcomingSchedule.slice(0, 12),
        recentUpdates,
        surveyor: resolvedSurveyor || null,
        dateContext: {
            today: londonTodayRaw,
            month: londonMonthKey,
        },
    });
};

let AdminDashboard = async (req, res) => {
    const selectedCompany = String(req.query.company || '').trim();
    const { allowedCompanies, companyScope } = await getLeadScope(req);
    const companyFilter = selectedCompany && selectedCompany !== 'All Companies' ? selectedCompany : null;
    const safeSelectedCompany = companyFilter && allowedCompanies.includes(companyFilter) ? companyFilter : null;
    const leadFilter = safeSelectedCompany ? { company: safeSelectedCompany } : companyScope;

    const [leads, clients, users, companies] = await Promise.all([
        Lead.find(leadFilter)
            .select({
                _id: 1,
                leadCode: 1,
                company: 1,
                status: 1,
                quote_price: 1,
                payment_due_amount: 1,
                in_quote_date: 1,
                in_survey_date: 1,
                in_design_date: 1,
                in_review_date: 1,
                close_date: 1,
                lost_date: 1,
                survey_date: 1,
                design_deadline: 1,
                createdAt: 1,
                updatedAt: 1,
                payment_history: 1,
            })
            .populate({ path: 'client', select: 'name', options: { lean: true } })
            .lean(),
        Client.find(req.userType === 'Admin' ? {} : buildCompanyMatch('access_company', allowedCompanies), { _id: 1, createdAt: 1 }).lean(),
        User.find({}, { userType: 1, createdAt: 1 }).lean(),
        Lead.distinct('company', { ...companyScope, company: { $exists: true, $ne: '' } }),
    ]);

    const londonToday = parseLeadDate(getLondonDateOnly());
    const currentMonthKey = getLondonMonthKey(londonToday);
    const monthFinanceTrend = [];
    for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(Date.UTC(londonToday.getUTCFullYear(), londonToday.getUTCMonth() - i, 1, 12, 0, 0, 0));
        monthFinanceTrend.push({
            key: getLondonMonthKey(d),
            label: new Intl.DateTimeFormat('en-GB', { timeZone: LONDON_TIME_ZONE, month: 'short', year: '2-digit' }).format(d),
            quoted: 0,
            received: 0,
            due: 0,
            closed: 0,
            lost: 0,
            winRate: 0,
        });
    }
    const monthFinanceMap = Object.fromEntries(monthFinanceTrend.map((item) => [item.key, item]));
    const statusCountsRunningMonth = Object.fromEntries(DASHBOARD_STATUSES.map((status) => [status, 0]));
    const statusCountsOverall = Object.fromEntries(DASHBOARD_STATUSES.map((status) => [status, 0]));
    const companyCounter = {};
    let receivedOverall = 0;
    let dueOverall = 0;

    for (const lead of leads) {
        const status = lead.status;
        if (!DASHBOARD_STATUSES.includes(status)) continue;
        statusCountsOverall[status] += 1;

        const statusDate =
            (status === 'In_Quote' && (parseLeadDate(lead.in_quote_date) || parseLeadDate(lead.updatedAt) || parseLeadDate(lead.createdAt))) ||
            (status === 'In_Survey' && (parseLeadDate(lead.in_survey_date) || parseLeadDate(lead.updatedAt) || parseLeadDate(lead.createdAt))) ||
            (status === 'In_Design' && (parseLeadDate(lead.in_design_date) || parseLeadDate(lead.updatedAt) || parseLeadDate(lead.createdAt))) ||
            (status === 'In_Review' && (parseLeadDate(lead.in_review_date) || parseLeadDate(lead.updatedAt) || parseLeadDate(lead.createdAt))) ||
            (status === 'Closed' && (parseLeadDate(lead.close_date) || parseLeadDate(lead.updatedAt) || parseLeadDate(lead.createdAt))) ||
            (status === 'Lost_Lead' && (parseLeadDate(lead.lost_date) || parseLeadDate(lead.updatedAt) || parseLeadDate(lead.createdAt))) ||
            parseLeadDate(lead.createdAt);
        if (statusDate && getLondonMonthKey(statusDate) === currentMonthKey) {
            statusCountsRunningMonth[status] += 1;
        }

        const company = String(lead.company || '').trim();
        if (company) companyCounter[company] = (companyCounter[company] || 0) + 1;

        dueOverall += parseMoney(lead.payment_due_amount);

        const quoteMonthKey = getLondonMonthKey(lead.in_quote_date);
        if (quoteMonthKey && monthFinanceMap[quoteMonthKey]) {
            monthFinanceMap[quoteMonthKey].quoted += parseMoney(lead.quote_price);
            monthFinanceMap[quoteMonthKey].due += parseMoney(lead.payment_due_amount);
        }

        for (const item of lead.payment_history || []) {
            const paid = parseMoney(item?.paid_amount);
            if (paid > 0) receivedOverall += paid;
            const paidMonthKey = getLondonMonthKey(item?.paid_at);
            if (paidMonthKey && monthFinanceMap[paidMonthKey]) monthFinanceMap[paidMonthKey].received += paid;
        }

        const closedMonthKey = getLondonMonthKey(lead.close_date);
        if (closedMonthKey && monthFinanceMap[closedMonthKey]) monthFinanceMap[closedMonthKey].closed += 1;
        const lostMonthKey = getLondonMonthKey(lead.lost_date);
        if (lostMonthKey && monthFinanceMap[lostMonthKey]) monthFinanceMap[lostMonthKey].lost += 1;
    }

    const financeTrend = monthFinanceTrend.map((item) => {
        const decided = item.closed + item.lost;
        const winRate = decided > 0 ? Number(((item.closed / decided) * 100).toFixed(1)) : 0;
        return { ...item, quoted: toFixedMoney(item.quoted), received: toFixedMoney(item.received), due: toFixedMoney(item.due), winRate };
    });
    const currentMonthFinance = financeTrend.find((item) => item.key === currentMonthKey) || { quoted: 0, received: 0, due: 0, closed: 0, lost: 0 };
    const sixMonthClosed = financeTrend.reduce((sum, item) => sum + item.closed, 0);
    const sixMonthLost = financeTrend.reduce((sum, item) => sum + item.lost, 0);
    const sixMonthDecided = sixMonthClosed + sixMonthLost;
    const sixMonthWinRate = sixMonthDecided > 0 ? ((sixMonthClosed / sixMonthDecided) * 100).toFixed(1) : '0.0';
    const overallClosed = leads.filter((lead) => Boolean(parseLeadDate(lead.close_date))).length;
    const overallLost = leads.filter((lead) => Boolean(parseLeadDate(lead.lost_date))).length;
    const overallDecided = overallClosed + overallLost;
    const overallWinRate = overallDecided > 0 ? ((overallClosed / overallDecided) * 100).toFixed(1) : '0.0';
    const runningMonthClosed = currentMonthFinance.closed || 0;
    const runningMonthLost = currentMonthFinance.lost || 0;
    const runningMonthDecided = runningMonthClosed + runningMonthLost;
    const runningMonthWinRate = runningMonthDecided > 0 ? ((runningMonthClosed / runningMonthDecided) * 100).toFixed(1) : '0.0';
    const usersByType = users.reduce((acc, user) => {
        const key = user.userType || 'Other';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    const upcomingDeadlines = leads
        .filter((lead) => lead.status === 'In_Survey' || lead.status === 'In_Design')
        .map((lead) => {
            const targetDate = lead.status === 'In_Survey' ? lead.survey_date : lead.design_deadline;
            const target = parseLeadDate(targetDate);
            if (!target || !londonToday) return null;
            const today = new Date(londonToday);
            today.setUTCHours(0, 0, 0, 0);
            const normalizedTarget = new Date(target);
            normalizedTarget.setUTCHours(0, 0, 0, 0);
            const dueInDays = Math.ceil((normalizedTarget - today) / (1000 * 60 * 60 * 24));
            return {
                _id: lead._id,
                leadCode: lead.leadCode,
                client: lead.client?.name || 'N/A',
                company: lead.company || 'N/A',
                status: lead.status === 'In_Survey' ? 'Site Survey' : 'Drawing Phase',
                targetDate,
                dueInDays,
            };
        })
        .filter(Boolean)
        .sort((a, b) => (parseLeadDate(a.targetDate)?.getTime() || 0) - (parseLeadDate(b.targetDate)?.getTime() || 0))
        .slice(0, 8);

    const currentMonthDate = parseLeadDate(`${currentMonthKey}-01`);
    const currentMonthLabelShort = currentMonthDate
        ? new Intl.DateTimeFormat('en-GB', { timeZone: LONDON_TIME_ZONE, month: 'short', year: '2-digit' }).format(currentMonthDate)
        : 'N/A';

    const safeCompanies = companies.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
    const scopedCompanyOptions = allowedCompanies
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b)));
    const companyOptions = req.userType === 'Admin'
        ? ['All Companies', ...safeCompanies]
        : ['All Companies', ...scopedCompanyOptions];

    const statusMeta = {
        Pending: { label: 'Leads', color: '#64748b' },
        In_Quote: { label: 'In Quotation', color: '#0ea5e9' },
        In_Survey: { label: 'Site Survey', color: '#06b6d4' },
        In_Design: { label: 'Drawing Phase', color: '#a855f7' },
        In_Review: { label: 'Under Review', color: '#f59e0b' },
        Closed: { label: 'Closed', color: '#22c55e' },
        Lost_Lead: { label: 'Lost Lead', color: '#ef4444' },
    };

    return res.status(200).json({
        companyOptions,
        metrics: {
            currentMonthKey,
            currentMonthLabelShort,
            totalClients: clients.length,
            totalClientsRunningMonth: clients.filter((client) => getLondonMonthKey(client.createdAt) === currentMonthKey).length,
            totalUsers: users.length,
            usersByType,
            topCompanies: Object.entries(companyCounter).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value })),
            pipelineRunningMonthChart: DASHBOARD_STATUSES.map((key) => ({ name: statusMeta[key].label, value: statusCountsRunningMonth[key] || 0, fill: statusMeta[key].color })),
            pipelineOverallChart: DASHBOARD_STATUSES.map((key) => ({ name: statusMeta[key].label, value: statusCountsOverall[key] || 0, fill: statusMeta[key].color })),
            pipelineRunningMonthTotal: Object.values(statusCountsRunningMonth).reduce((sum, value) => sum + value, 0),
            teamChart: [
                { name: 'Admin', value: usersByType.Admin || 0, fill: '#334155' },
                { name: 'Management', value: usersByType.Management || 0, fill: '#475569' },
                { name: 'Surveyor', value: usersByType.Surveyor || 0, fill: '#06b6d4' },
                { name: 'Designer', value: usersByType.Designer || 0, fill: '#a855f7' },
            ].filter((item) => item.value > 0),
            financeTrend,
            winRateTrend: financeTrend.map((item) => ({ label: item.label, winRate: item.winRate, closed: item.closed, lost: item.lost })),
            sixMonthWinRate,
            sixMonthClosed,
            sixMonthLost,
            overallWinRate,
            overallClosed,
            overallLost,
            runningMonthWinRate,
            runningMonthClosed,
            runningMonthLost,
            receivedThisMonth: currentMonthFinance.received,
            quotedThisMonth: currentMonthFinance.quoted,
            dueThisMonth: currentMonthFinance.due,
            receivedOverall: toFixedMoney(receivedOverall),
            dueOverall: toFixedMoney(dueOverall),
            upcomingDeadlines,
        },
    });
};

let DesignerDashboard = async (req, res) => {
    if (!['Admin', 'Management', 'Designer'].includes(req.userType)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const designerNameRaw = String(req.query?.designer || '').trim();
    const identityCandidates = [
        String(req.name || '').trim(),
        String(req.username || '').trim(),
    ].filter(Boolean);

    const { companyScope } = await getLeadScope(req);
    const baseMatch = { designer: { $exists: true, $ne: '' }, ...companyScope };
    if (req.userType === 'Designer') {
        if (!identityCandidates.length) {
            return res.status(400).json({ error: 'Designer identity not found.' });
        }
        baseMatch.$or = identityCandidates.map((value) => ({
            designer: { $regex: `^${escapeRegex(value)}$`, $options: 'i' }
        }));
    } else if (designerNameRaw) {
        baseMatch.designer = { $regex: `^${escapeRegex(designerNameRaw)}$`, $options: 'i' };
    }

    const leads = await Lead.find(baseMatch)
        .select('leadCode company status stage designer design_deadline in_design_date in_review_date close_date createdAt updatedAt')
        .populate({ path: 'client', select: 'name phone email company', options: { lean: true } })
        .lean();

    const londonTodayRaw = getLondonDateOnly();
    const londonToday = parseLeadDate(londonTodayRaw);
    const londonMonthKey = getLondonMonthKey(londonTodayRaw);

    const toDaysLeft = (value) => {
        const date = parseLeadDate(value);
        if (!date || !londonToday) return null;
        const start = new Date(londonToday);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setUTCHours(0, 0, 0, 0);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    };

    const statusBreakdownMap = {
        Pending: 0,
        In_Quote: 0,
        In_Survey: 0,
        In_Design: 0,
        In_Review: 0,
        Closed: 0,
        Lost_Lead: 0,
    };

    let inDesignNow = 0;
    let dueToday = 0;
    let overdue = 0;
    let scheduledThisMonth = 0;
    let completedThisMonth = 0;

    const upcomingDeadlines = [];
    const recentUpdates = [...leads].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 10);

    for (const lead of leads) {
        if (statusBreakdownMap[lead.status] !== undefined) {
            statusBreakdownMap[lead.status] += 1;
        }

        if (lead.status === 'In_Design') inDesignNow += 1;

        const designDate = parseLeadDate(lead.design_deadline);
        const daysLeft = toDaysLeft(lead.design_deadline);
        const designCompleted = lead.status === 'In_Review' || lead.status === 'Closed';

        if (designDate && getLondonMonthKey(designDate) === londonMonthKey) {
            scheduledThisMonth += 1;
        }
        if (designCompleted && getLondonMonthKey(lead.updatedAt) === londonMonthKey) {
            completedThisMonth += 1;
        }

        if (daysLeft === 0 && !designCompleted) dueToday += 1;
        if (daysLeft !== null && daysLeft < 0 && !designCompleted) overdue += 1;

        if (designDate && !designCompleted) {
            upcomingDeadlines.push({
                _id: lead._id,
                leadCode: lead.leadCode,
                client: lead.client || null,
                company: lead.company || '',
                designer: lead.designer || '',
                design_deadline: lead.design_deadline || '',
                status: lead.status || '',
                dueInDays: daysLeft,
            });
        }
    }

    upcomingDeadlines.sort((a, b) => (parseLeadDate(a.design_deadline) - parseLeadDate(b.design_deadline)));
    const statusBreakdown = Object.entries(statusBreakdownMap).map(([status, count]) => ({ status, count }));

    const resolvedDesigner = req.userType === 'Designer'
        ? (identityCandidates[0] || '')
        : designerNameRaw;

    return res.status(200).json({
        summary: {
            totalAssigned: leads.length,
            inDesignNow,
            dueToday,
            overdue,
            scheduledThisMonth,
            completedThisMonth,
        },
        statusBreakdown,
        upcomingDeadlines: upcomingDeadlines.slice(0, 12),
        recentUpdates,
        designer: resolvedDesigner || null,
        dateContext: {
            today: londonTodayRaw,
            month: londonMonthKey,
        },
    });
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

    const { companyScope } = await getLeadScope(req);
    const leads = await Lead.find({
        ...companyScope,
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

    const { allowedCompanies, companyScope } = await getLeadScope(req);
    const baseMatch = { ...companyScope };

    if (company && String(company).trim() && String(company) !== 'All') {
        const pickedCompany = String(company).trim();
        if (!allowedCompanies.includes(pickedCompany)) {
            return res.status(403).send('Selected company is outside your access.');
        }
        baseMatch.company = pickedCompany;
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

    const companies = await Lead.distinct('company', { ...companyScope, company: { $exists: true, $ne: '' } });
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

module.exports = { Leads, Create, View, Update, Delete, Pending, Closed, Lost_Lead, Comment, UploadDescriptionImages, In_Quote, In_Survey, Survey_Data, In_Design, In_Review, AddPayment, EditPayment, SurveyorDashboard, DesignerDashboard, AdminDashboard, IncomeReport, MonthlyReport };
