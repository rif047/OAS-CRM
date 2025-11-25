let Client = require('./Client_Model');



let Clients = async (req, res) => {
    let Data = await Client.find();
    res.status(200).json(Data);
}




let Create = async (req, res) => {
    try {
        let { agent, name, phone, alt_phone, remark } = req.body;

        if (!agent) { return res.status(400).send('User is required!'); }
        if (!name) { return res.status(400).send('Client Name is required!'); }
        if (!phone) { return res.status(400).send('Phone is required!'); }

        let checkPhone = await Client.findOne({ phone });
        if (checkPhone) { return res.status(400).send('Phone number already exists. Use different one.'); };


        let newData = new Client({
            agent,
            name,
            phone,
            alt_phone,
            remark,
        });

        await newData.save();
        res.status(200).json(newData);
        console.log('Created Successfully');

    } catch (error) {
        console.error(error);
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
            const { agent, name, phone, alt_phone, remark } = emp;

            if (!agent || !name || !phone) {
                console.log(`Skipped invalid entry: ${name || 'Unnamed'}`);
                continue;
            }

            const exists = await Client.findOne({ phone });
            if (exists) {
                console.log(`⚠️ Skipped duplicate phone: ${phone}`);
                continue;
            }

            validClients.push({ agent, name, phone, alt_phone, remark });
        }

        if (validClients.length === 0) {
            return res.status(400).send('No valid data to import.');
        }

        await Client.insertMany(validClients, { ordered: false });
        res.status(200).send(`${validClients.length} clients imported successfully.`);

        console.log(`✅ Imported ${validClients.length} clients.`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Bulk import failed.');
    }
};







let View = async (req, res) => {
    let viewOne = await Client.findById(req.params.id);
    res.send(viewOne)
}




let Update = async (req, res) => {
    try {
        let { agent, name, phone, alt_phone, remark } = req.body;

        if (!agent) { return res.status(400).send('User is required!'); }
        if (!name) { return res.status(400).send('Client Name is required!'); }
        if (!phone) { return res.status(400).send('Phone is required!'); }

        let checkPhone = await Client.findOne({ phone: phone, _id: { $ne: req.params.id } });
        if (checkPhone) { return res.status(400).send('Phone number already exists. Use different one.'); }


        let updateData = await Client.findById(req.params.id);

        updateData.agent = agent;
        updateData.name = name;
        updateData.phone = phone;
        updateData.alt_phone = alt_phone;
        updateData.remark = remark;

        await updateData.save();
        res.status(200).json(updateData);
        console.log('Updated Successfully');

    } catch (error) {
        console.error(error);
        res.status(500).send('Updating Error!!!');
    }
}





let Delete = async (req, res) => {
    await Client.findByIdAndDelete(req.params.id);
    res.status(200).send('Deleted')
}




module.exports = { Clients, Create, BulkImport, View, Update, Delete }