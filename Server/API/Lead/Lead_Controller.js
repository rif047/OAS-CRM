let Lead = require('./Lead_Model');



let Leads = async (req, res) => {
    let Data = await Lead.find().populate(['client']);
    res.status(200).json(Data);
};



let Create = async (req, res) => {
    try {
        const { client, agent, address, company, property_name, property_type, extention_type, design_prepared, building_regulations_drawings, planning_permission, budget, when_start, file_link, source, source_link, remark } = req.body;

        for (let [key, label] of Object.entries({
            company: 'Company',
            client: 'Client',
            source: 'Source',
        })) { if (!req.body[key]) return res.status(400).json(`${label} is required!`); }

        let checkSourceLink = await Lead.findOne({ source_link });
        if (checkSourceLink) { return res.status(400).json('Source link already exists. Use different one.'); };



        const generateLeadCode = () => {
            const timePart = Date.now().toString().slice(-3);
            const randomPart = Math.floor(10 + Math.random() * 90);
            return `ID-${timePart}${randomPart}`;
        };


        let leadCode;
        let isUnique = false;
        while (!isUnique) {
            leadCode = generateLeadCode();
            const exists = await Lead.findOne({ leadCode });
            if (!exists) isUnique = true;
        }

        let newData = new Lead({
            leadCode,
            client,
            agent,
            address,
            company,
            property_name,
            property_type,
            extention_type,
            design_prepared,
            building_regulations_drawings,
            planning_permission,
            budget,
            when_start,
            file_link,
            source,
            source_link,
            remark,
            status: 'Pending'
        });

        await newData.save();
        res.status(200).json(newData);
        console.log('Created Successfully');

    } catch (error) {
        console.error(error);
        res.status(500).json('Creation Error!!!');
    }
};







let View = async (req, res) => {
    let viewOne = await Lead.findById(req.params.id).populate('client');
    res.send(viewOne);
};








let Update = async (req, res) => {
    try {
        const { client, agent, address, company, property_name, property_type, extention_type, design_prepared, building_regulations_drawings, planning_permission, budget, when_start, file_link, source, source_link, remark } = req.body;

        const requiredFields = {
            company: 'Company',
            client: 'Client',
            source: 'Source',
        };

        for (let [key, label] of Object.entries(requiredFields)) {
            if (!req.body[key]) {
                return res.status(400).send(`${label} is required!`);
            }
        }


        let checkSourceLink = await Lead.findOne({ source_link: source_link, _id: { $ne: req.params.id } });
        if (checkSourceLink) { return res.status(400).send('Source link already exists. Use different one.'); }


        let updateData = await Lead.findById(req.params.id);

        updateData.client = client;
        updateData.agent = agent;
        updateData.address = address;
        updateData.company = company;
        updateData.property_name = property_name;
        updateData.property_type = property_type;
        updateData.extention_type = extention_type;
        updateData.design_prepared = design_prepared;
        updateData.building_regulations_drawings = building_regulations_drawings;
        updateData.planning_permission = planning_permission;
        updateData.budget = budget;
        updateData.when_start = when_start;
        updateData.file_link = file_link;
        updateData.source = source;
        updateData.source_link = source_link;
        updateData.remark = remark;

        await updateData.save();
        res.status(200).json(updateData);
        console.log('Updated Successfully');

    } catch (error) {
        console.error(error);
        res.status(500).send('Updating Error!!!');
    }
};







let Pending = async (req, res) => {
    try {

        let updateData = await Lead.findById(req.params.id);

        if (!updateData) {
            return res.status(404).send('Lead not found');
        }
        updateData.date = '';
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
        const { agent, quote_file, remark } = req.body;

        if (!quote_file) {
            return res.status(400).send('Quote file link is required!');
        }

        const updateData = await Lead.findById(req.params.id);
        if (!updateData) return res.status(404).send('Lead not found');

        updateData.agent = agent || updateData.agent;
        updateData.quote_file = quote_file;
        updateData.remark = remark;
        updateData.status = 'In_Quote';
        updateData.in_quote_date = new Date().toISOString().split('T')[0];

        await updateData.save();
        console.log('In_Quote updated successfully');
        res.status(200).json(updateData);
    } catch (error) {
        console.error('Error updating In_Quote:', error);
        res.status(500).send('Updating error!');
    }
};


let In_Servey = async (req, res) => {
    try {
        const { agent, date, fee, wages, employee, advance_fee, status, remark } = req.body;

        const requiredFields = {
            agent: 'Agent',
            fee: 'Fees',
            wages: 'Wage',
            employee: 'Employee',
            advance_fee: 'Advance Fee',
        };

        for (let [key, label] of Object.entries(requiredFields)) {
            if (!req.body[key]) {
                return res.status(400).send(`${label} is required!`);
            }
        }

        let updateData = await Lead.findById(req.params.id);

        updateData.agent = agent;
        updateData.advance_fee = advance_fee || 0;
        updateData.fee = fee;
        updateData.wages = wages;
        updateData.employee = employee;
        updateData.remark = remark;
        updateData.status = 'PendingPayment';
        updateData.date = new Date().toISOString().split('T')[0];

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
        const { agent, date, fee, wages, employee, advance_fee, status, remark } = req.body;

        const requiredFields = {
            agent: 'Agent',
            fee: 'Fees',
            wages: 'Wage',
            employee: 'Employee',
            advance_fee: 'Advance Fee',
        };

        for (let [key, label] of Object.entries(requiredFields)) {
            if (!req.body[key]) {
                return res.status(400).send(`${label} is required!`);
            }
        }

        let updateData = await Lead.findById(req.params.id);

        updateData.agent = agent;
        updateData.advance_fee = advance_fee || 0;
        updateData.fee = fee;
        updateData.wages = wages;
        updateData.employee = employee;
        updateData.remark = remark;
        updateData.status = 'PendingPayment';
        updateData.date = new Date().toISOString().split('T')[0];

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
        const { agent, date, fee, wages, employee, advance_fee, status, remark } = req.body;

        const requiredFields = {
            agent: 'Agent',
            fee: 'Fees',
            wages: 'Wage',
            employee: 'Employee',
            advance_fee: 'Advance Fee',
        };

        for (let [key, label] of Object.entries(requiredFields)) {
            if (!req.body[key]) {
                return res.status(400).send(`${label} is required!`);
            }
        }

        let updateData = await Lead.findById(req.params.id);

        updateData.agent = agent;
        updateData.advance_fee = advance_fee || 0;
        updateData.fee = fee;
        updateData.wages = wages;
        updateData.employee = employee;
        updateData.remark = remark;
        updateData.status = 'PendingPayment';
        updateData.date = new Date().toISOString().split('T')[0];

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
        const { agent, date, fee, wages, employee, status, remark } = req.body;

        const requiredFields = {
            agent: 'Agent',
            fee: 'Fees',
            wages: 'Wage',
            employee: 'Employee',
        };

        for (let [key, label] of Object.entries(requiredFields)) {
            if (!req.body[key]) {
                return res.status(400).send(`${label} is required!`);
            }
        }

        let updateData = await Lead.findById(req.params.id);

        updateData.agent = agent;
        updateData.fee = fee;
        updateData.wages = wages;
        updateData.employee = employee;
        updateData.remark = remark;
        updateData.status = 'Closed';
        updateData.date = new Date().toISOString().split('T')[0];

        await updateData.save();
        res.status(200).json(updateData);
        console.log('Updated Successfully');

    } catch (error) {
        console.error(error);
        res.status(500).send('Updating Error!!!');
    }
}



let Cancelled = async (req, res) => {
    try {
        const updateData = await Lead.findById(req.params.id);
        if (!updateData) return res.status(404).send('Lead not found');

        updateData.cancel_date = new Date().toISOString().split('T')[0];
        updateData.remark = req.body.remark || updateData.remark;
        updateData.status = 'Cancelled';

        await updateData.save();
        console.log('Cancelled Successfully');
        res.status(200).json(updateData);
    } catch (error) {
        console.error('Error cancelling:', error);
        res.status(500).send('Error cancelling');
    }
};



let Delete = async (req, res) => {
    await Lead.findByIdAndDelete(req.params.id);
    res.send('Deleted')
}


module.exports = { Leads, Create, View, Update, Delete, Pending, Closed, Cancelled, In_Quote, In_Servey, In_Design, In_Review };
