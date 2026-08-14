const sanitizeHtml = require('sanitize-html');
const Mongoose = require('mongoose');
const Professional = require('./Professional_Model');
const Client = require('../Client/Client_Model');
const { COMPANY_OPTIONS } = require('../../Config/Companies');
const { resolveAssignedCompaniesForRequest } = require('../../Utils/CompanyAccess');
const { handleControllerError } = require('../../Utils/ControllerError');

const PROFESSIONAL_SECTORS = [
    'Emergency',
    'Plumber',
    'Electrician',
    'Roofer',
    'Builder',
    'Gardener',
    'Painter / Decorator',
    'Landscaper',
    'Carpenter',
    'Plasterer',
    'Driveways / Patios / Paths',
    'Fencing / Gates',
    'Tree Surgeon',
    'Handyman',
    'Locksmith',
    'Bathrooms',
    'Tiler - Tiling',
    'Central Heating',
    'Gas Boiler Servicing / Repair',
    'Other',
];

const LONDON_TIME_ZONE = 'Europe/London';

const normalizeOptionalField = (value) => {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).trim();
    return normalized ? normalized : undefined;
};

const normalizeRequiredField = (value) => {
    const normalized = normalizeOptionalField(value);
    return normalized || '';
};

const normalizeOptionalPhone = (value) => {
    const normalized = normalizeOptionalField(value);
    if (!normalized) return { value: undefined };

    if (!/^\+?\d+$/.test(normalized)) {
        return { error: 'Phone number must contain numbers only.' };
    }

    return { value: normalized };
};

const normalizeOptionalEmail = (value) => {
    const normalized = normalizeOptionalField(value);
    if (!normalized) return { value: undefined };

    const lowered = normalized.toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lowered)) {
        return { error: 'Invalid email format.' };
    }

    return { value: lowered };
};

const sanitizeDescription = (value) => {
    const safeValue = String(value || '');
    if (!safeValue.trim()) return '';

    return sanitizeHtml(safeValue, {
        allowedTags: ['p', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'span'],
        allowedAttributes: {
            span: ['style'],
        },
        allowedStyles: {
            '*': {
                color: [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/],
                'font-weight': [/^bold$/],
                'font-style': [/^italic$/],
                'text-decoration': [/^underline$/],
            },
        },
    });
};

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const noteToHtml = (value) => escapeHtml(value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('<br>');

const hasMeaningfulText = (value = '') => {
    if (typeof value !== 'string') return false;
    return String(value).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() !== '';
};

const formatLondonDateTime = () => {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: LONDON_TIME_ZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(new Date());

    const mapped = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${mapped.day}/${mapped.month}/${mapped.year} ${mapped.hour}:${mapped.minute}`;
};

const appendNoteToDescription = (oldDescription, note, agentName) => {
    const safeNote = noteToHtml(note);
    if (!hasMeaningfulText(safeNote)) return oldDescription || '';

    const header = `<b>${formatLondonDateTime()} - ${escapeHtml(agentName || 'System')}</b>`;
    const formattedNote = `${header}<br>${safeNote}`;
    const cleanOld = sanitizeDescription(oldDescription || '').trim();

    return cleanOld ? `${cleanOld}<br><br>${formattedNote}` : formattedNote;
};

const getProfessionalAllowedCompanies = async (req) => {
    if (req.userType === 'Admin' || req.userType === 'Surveyor') {
        return [...COMPANY_OPTIONS];
    }

    return resolveAssignedCompaniesForRequest(req);
};

const getProfessionalScope = async (req) => {
    const allowedCompanies = await getProfessionalAllowedCompanies(req);
    const companyScope = {};

    return { allowedCompanies, companyScope };
};

const buildProfessionalPayload = async (req, { allowDescription = true } = {}) => {
    const {
        agent,
        name,
        phone,
        alt_phone,
        email,
        company,
        address,
        sector,
        description,
    } = req.body;

    const normalizedAgent = normalizeOptionalField(agent);
    const normalizedName = normalizeOptionalField(name);
    const normalizedCompany = normalizeOptionalField(company);
    const normalizedAddress = normalizeOptionalField(address);
    const normalizedSector = normalizeRequiredField(sector);
    const normalizedPhoneResult = normalizeOptionalPhone(phone);
    const normalizedAltPhoneResult = normalizeOptionalPhone(alt_phone);
    const normalizedEmailResult = normalizeOptionalEmail(email);

    if (!normalizedAgent) return { error: { status: 400, message: 'User is required!' } };
    if (!normalizedName) return { error: { status: 400, message: 'Professional Name is required!' } };
    if (!normalizedSector) return { error: { status: 400, message: 'Sector is required!' } };
    if (normalizedPhoneResult.error) return { error: { status: 400, message: normalizedPhoneResult.error } };
    if (normalizedAltPhoneResult.error) return { error: { status: 400, message: 'Alternative phone number must contain numbers only.' } };
    if (normalizedEmailResult.error) return { error: { status: 400, message: normalizedEmailResult.error } };

    const payload = {
        agent: normalizedAgent,
        name: normalizedName,
        phone: normalizedPhoneResult.value,
        alt_phone: normalizedAltPhoneResult.value,
        email: normalizedEmailResult.value,
        company: normalizedCompany,
        address: normalizedAddress,
        sector: normalizedSector,
    };

    if (allowDescription) {
        payload.description = sanitizeDescription(description);
    }

    return { payload };
};

const Professionals = async (req, res) => {
    const { companyScope } = await getProfessionalScope(req);
    const filter = { ...companyScope };
    const sector = normalizeOptionalField(req.query.sector);

    if (sector && sector.toLowerCase() !== 'all') {
        filter.sector = sector;
    }

    const data = await Professional.find(filter)
        .sort({ createdAt: -1 })
        .lean();

    res.status(200).json(data);
};

const Meta = async (_req, res) => {
    res.status(200).json({ sectors: PROFESSIONAL_SECTORS });
};

const Create = async (req, res) => {
    try {
        const { payload, error } = await buildProfessionalPayload(req, { allowDescription: true });
        if (error) return res.status(error.status).send(error.message);

        if (payload.phone) {
            const checkPhone = await Professional.findOne({ phone: payload.phone }).select('_id');
            if (checkPhone) return res.status(400).send('Phone number already exists. Use different one.');
        }

        if (payload.email) {
            const checkEmail = await Professional.findOne({ email: payload.email }).select('_id');
            if (checkEmail) return res.status(400).send('Email already exists. Use different one.');
        }

        const newData = new Professional(payload);
        await newData.save();

        res.status(200).json(newData);
    } catch (error) {
        console.error(error);
        return handleControllerError(res, error, 'Creation Error!!!');
    }
};

const View = async (req, res) => {
    const { companyScope } = await getProfessionalScope(req);
    const viewOne = await Professional.findOne({
        _id: req.params.id,
        ...companyScope,
    }).lean();

    if (!viewOne) return res.status(404).send('Professional not found');
    res.status(200).json(viewOne);
};

const Update = async (req, res) => {
    try {
        const { companyScope } = await getProfessionalScope(req);
        const { payload, error } = await buildProfessionalPayload(req, { allowDescription: false });
        if (error) return res.status(error.status).send(error.message);

        if (payload.phone) {
            const checkPhone = await Professional.findOne({ phone: payload.phone, _id: { $ne: req.params.id } }).select('_id');
            if (checkPhone) return res.status(400).send('Phone number already exists. Use different one.');
        }

        if (payload.email) {
            const checkEmail = await Professional.findOne({ email: payload.email, _id: { $ne: req.params.id } }).select('_id');
            if (checkEmail) return res.status(400).send('Email already exists. Use different one.');
        }

        const updateData = await Professional.findOne({
            _id: req.params.id,
            ...companyScope,
        });
        if (!updateData) return res.status(404).send('Professional not found');

        updateData.agent = payload.agent;
        updateData.name = payload.name;
        updateData.phone = payload.phone;
        updateData.alt_phone = payload.alt_phone;
        updateData.email = payload.email;
        updateData.company = payload.company;
        updateData.address = payload.address;
        updateData.sector = payload.sector;

        await updateData.save();
        res.status(200).json(updateData);
    } catch (error) {
        console.error(error);
        return handleControllerError(res, error, 'Updating Error!!!');
    }
};

const AddNote = async (req, res) => {
    try {
        const { companyScope } = await getProfessionalScope(req);
        const note = String(req.body.note || req.body.description || '');
        const agent = normalizeOptionalField(req.body.agent) || req.name || req.username || 'System';

        if (!hasMeaningfulText(note)) {
            return res.status(400).send('Note is required.');
        }

        const updateData = await Professional.findOne({
            _id: req.params.id,
            ...companyScope,
        });
        if (!updateData) return res.status(404).send('Professional not found');

        updateData.description = appendNoteToDescription(updateData.description, note, agent);
        updateData.agent = agent;

        await updateData.save();
        res.status(200).json(updateData);
    } catch (error) {
        console.error(error);
        return handleControllerError(res, error, 'Note update failed.');
    }
};

const MakeAsClient = async (req, res) => {
    try {
        const { allowedCompanies, companyScope } = await getProfessionalScope(req);
        const defaultAccessCompany = allowedCompanies[0];
        if (!defaultAccessCompany) {
            return res.status(400).send('No assigned company found for this user. Please assign a company before making client.');
        }

        const professional = await Professional.findOne({
            _id: req.params.id,
            ...companyScope,
        });
        if (!professional) return res.status(404).send('Professional not found');

        if (professional.is_client && professional.client) {
            const existingLinkedClient = await Client.findById(professional.client).lean();
            return res.status(200).json({
                professional,
                client: existingLinkedClient,
                created: false,
                message: 'Professional is already a client.',
            });
        }

        const duplicateConditions = [];
        if (professional.phone) duplicateConditions.push({ phone: professional.phone });
        if (professional.email) duplicateConditions.push({ email: professional.email });

        let client = null;
        let created = false;

        if (duplicateConditions.length) {
            const duplicateClients = await Client.find({ $or: duplicateConditions }).lean();
            const uniqueClientIds = [...new Set(duplicateClients.map((item) => String(item._id)))];

            if (uniqueClientIds.length > 1) {
                return res.status(409).send('Contact number and email match different clients. Please resolve the duplicate client data first.');
            }

            if (duplicateClients.length === 1) {
                const visibleClient = await Client.findOne({
                    _id: duplicateClients[0]._id,
                });

                if (!visibleClient) {
                    return res.status(403).send('A client with this contact already exists outside your company access.');
                }

                client = visibleClient;
            }
        }

        if (client && !client.access_company) {
            client.access_company = defaultAccessCompany;
            await client.save();
        }

        if (!client) {
            const clientDescriptionParts = [];
            if (professional.address) {
                clientDescriptionParts.push(`<p><b>Professional Address:</b> ${escapeHtml(professional.address)}</p>`);
            }
            if (professional.description) {
                clientDescriptionParts.push(professional.description);
            }

            client = new Client({
                agent: professional.agent || req.name || req.username || 'System',
                name: professional.name,
                phone: professional.phone,
                alt_phone: professional.alt_phone,
                email: professional.email,
                company: professional.company,
                access_company: defaultAccessCompany,
                description: clientDescriptionParts.join(''),
            });
            await client.save();
            created = true;
        }

        professional.is_client = true;
        professional.client = client._id;
        professional.converted_at = new Date();
        if (Mongoose.Types.ObjectId.isValid(req.userId)) {
            professional.converted_by = req.userId;
        }
        professional.converted_by_name = req.name || req.username || professional.agent || 'System';

        await professional.save();

        res.status(200).json({
            professional,
            client,
            created,
            message: created ? 'Client created successfully.' : 'Existing client linked successfully.',
        });
    } catch (error) {
        console.error(error);
        return handleControllerError(res, error, 'Client conversion failed.');
    }
};

const Delete = async (req, res) => {
    const { companyScope } = await getProfessionalScope(req);
    const deleted = await Professional.findOneAndDelete({
        _id: req.params.id,
        ...companyScope,
    });

    if (!deleted) return res.status(404).send('Professional not found');
    res.status(200).send('Deleted');
};

module.exports = { Professionals, Meta, Create, View, Update, AddNote, MakeAsClient, Delete };
