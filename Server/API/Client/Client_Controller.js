let Client = require('./Client_Model');

const normalizeOptionalField = (value) => {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).trim();
    return normalized ? normalized : undefined;
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


let Clients = async (req, res) => {
    let Data = await Client.find().sort({ createdAt: -1 }).lean();
    res.status(200).json(Data);
}




let Create = async (req, res) => {
    try {
        let { agent, name, phone, alt_phone, email, company, description } = req.body;

        const normalizedAgent = normalizeOptionalField(agent);
        const normalizedName = normalizeOptionalField(name);
        const normalizedCompany = normalizeOptionalField(company);
        const normalizedDescription = normalizeOptionalField(description);
        const normalizedAltPhoneResult = normalizeOptionalPhone(alt_phone);
        const normalizedPhoneResult = normalizeOptionalPhone(phone);
        const normalizedEmailResult = normalizeOptionalEmail(email);

        if (!normalizedAgent) { return res.status(400).send('User is required!'); }
        if (!normalizedName) { return res.status(400).send('Client Name is required!'); }
        if (normalizedPhoneResult.error) { return res.status(400).send(normalizedPhoneResult.error); }
        if (normalizedAltPhoneResult.error) { return res.status(400).send('Alternative phone number must contain numbers only.'); }
        if (normalizedEmailResult.error) { return res.status(400).send(normalizedEmailResult.error); }

        if (normalizedPhoneResult.value) {
            let checkPhone = await Client.findOne({ phone: normalizedPhoneResult.value });
            if (checkPhone) { return res.status(400).send('Phone number already exists. Use different one.'); }
        }

        if (normalizedEmailResult.value) {
            let checkEmail = await Client.findOne({ email: normalizedEmailResult.value });
            if (checkEmail) { return res.status(400).send('Email already exists. Use different one.'); }
        }

        let newData = new Client({
            agent: normalizedAgent,
            name: normalizedName,
            phone: normalizedPhoneResult.value,
            alt_phone: normalizedAltPhoneResult.value,
            email: normalizedEmailResult.value,
            company: normalizedCompany,
            description: normalizedDescription,
        });

        await newData.save();
        res.status(200).json(newData);
        console.log('Created Successfully');

    } catch (error) {
        console.error(error);
        if (error?.code === 11000) {
            if (error?.keyPattern?.phone) return res.status(400).send('Phone number already exists. Use different one.');
            if (error?.keyPattern?.email) return res.status(400).send('Email already exists. Use different one.');
        }
        res.status(500).send('Creation Error!!!');
    }
}



let BulkImport = async (req, res) => {
    try {
        let clients = req.body;

        if (!Array.isArray(clients) || clients.length === 0) {
            return res.status(400).send('Invalid or empty data array.');
        }

        let validClients = [];
        for (let emp of clients) {
            const { agent, name, phone, alt_phone, email, company, description } = emp;
            const normalizedAgent = normalizeOptionalField(agent);
            const normalizedName = normalizeOptionalField(name);
            const normalizedPhoneResult = normalizeOptionalPhone(phone);
            const normalizedAltPhoneResult = normalizeOptionalPhone(alt_phone);
            const normalizedEmailResult = normalizeOptionalEmail(email);
            const normalizedCompany = normalizeOptionalField(company);
            const normalizedDescription = normalizeOptionalField(description);

            if (!normalizedAgent || !normalizedName || normalizedPhoneResult.error || normalizedAltPhoneResult.error || normalizedEmailResult.error) {
                console.log(`Skipped invalid entry: ${name || 'Unnamed'}`);
                continue;
            }

            if (normalizedPhoneResult.value) {
                const exists = await Client.findOne({ phone: normalizedPhoneResult.value });
                if (exists) {
                    console.log(`⚠️ Skipped duplicate phone: ${normalizedPhoneResult.value}`);
                    continue;
                }
            }

            if (normalizedEmailResult.value) {
                const existsEmail = await Client.findOne({ email: normalizedEmailResult.value });
                if (existsEmail) {
                    console.log(`⚠️ Skipped duplicate email: ${normalizedEmailResult.value}`);
                    continue;
                }
            }

            validClients.push({
                agent: normalizedAgent,
                name: normalizedName,
                phone: normalizedPhoneResult.value,
                alt_phone: normalizedAltPhoneResult.value,
                email: normalizedEmailResult.value,
                company: normalizedCompany,
                description: normalizedDescription
            });
        }

        if (validClients.length === 0) {
            return res.status(400).send('No valid data to import.');
        }

        await Client.insertMany(validClients, { ordered: false });
        res.status(200).send(`${validClients.length} clients imported successfully.`);

        console.log(`✅ Imported ${validClients.length} clients.`);
    } catch (error) {
        console.error(error);
        if (error?.code === 11000) {
            if (error?.keyPattern?.phone) return res.status(400).send('Phone number already exists. Use different one.');
            if (error?.keyPattern?.email) return res.status(400).send('Email already exists. Use different one.');
        }
        res.status(500).send('Bulk import failed.');
    }
};







let View = async (req, res) => {
    let viewOne = await Client.findById(req.params.id).lean();
    if (!viewOne) return res.status(404).send('Client not found');
    res.send(viewOne)
}




let Update = async (req, res) => {
    try {
        let { agent, name, phone, alt_phone, email, company, description } = req.body;

        const normalizedAgent = normalizeOptionalField(agent);
        const normalizedName = normalizeOptionalField(name);
        const normalizedCompany = normalizeOptionalField(company);
        const normalizedDescription = normalizeOptionalField(description);
        const normalizedAltPhoneResult = normalizeOptionalPhone(alt_phone);
        const normalizedPhoneResult = normalizeOptionalPhone(phone);
        const normalizedEmailResult = normalizeOptionalEmail(email);

        if (!normalizedAgent) { return res.status(400).send('User is required!'); }
        if (!normalizedName) { return res.status(400).send('Client Name is required!'); }
        if (normalizedPhoneResult.error) { return res.status(400).send(normalizedPhoneResult.error); }
        if (normalizedAltPhoneResult.error) { return res.status(400).send('Alternative phone number must contain numbers only.'); }
        if (normalizedEmailResult.error) { return res.status(400).send(normalizedEmailResult.error); }

        if (normalizedPhoneResult.value) {
            let checkPhone = await Client.findOne({ phone: normalizedPhoneResult.value, _id: { $ne: req.params.id } });
            if (checkPhone) { return res.status(400).send('Phone number already exists. Use different one.'); }
        }

        if (normalizedEmailResult.value) {
            let checkEmail = await Client.findOne({ email: normalizedEmailResult.value, _id: { $ne: req.params.id } });
            if (checkEmail) { return res.status(400).send('Email already exists. Use different one.'); }
        }


        let updateData = await Client.findById(req.params.id);
        if (!updateData) { return res.status(404).send('Client not found'); }

        updateData.agent = normalizedAgent;
        updateData.name = normalizedName;
        updateData.phone = normalizedPhoneResult.value;
        updateData.alt_phone = normalizedAltPhoneResult.value;
        updateData.email = normalizedEmailResult.value;
        updateData.company = normalizedCompany;
        updateData.description = normalizedDescription;

        await updateData.save();
        res.status(200).json(updateData);
        console.log('Updated Successfully');

    } catch (error) {
        console.error(error);
        if (error?.code === 11000) {
            if (error?.keyPattern?.phone) return res.status(400).send('Phone number already exists. Use different one.');
            if (error?.keyPattern?.email) return res.status(400).send('Email already exists. Use different one.');
        }
        res.status(500).send('Updating Error!!!');
    }
}





let Delete = async (req, res) => {
    const deleted = await Client.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).send('Client not found');
    res.status(200).send('Deleted')
}




module.exports = { Clients, Create, BulkImport, View, Update, Delete }
