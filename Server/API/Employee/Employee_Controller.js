let Employee = require('./Employee_Model');



let Employees = async (req, res) => {
    let Data = await Employee.find();
    res.status(200).json(Data);
}




let Create = async (req, res) => {
    try {
        let { management, name, phone, alt_phone, address, city, preferred_location, availability, experience, position, right_to_work, remark } = req.body;

        if (!management) { return res.status(400).send('Management is required!'); }
        if (!name) { return res.status(400).send('Employee Name is required!'); }
        if (!phone) { return res.status(400).send('Phone is required!'); }
        if (!address) { return res.status(400).send('Address is required!'); }
        if (!city) { return res.status(400).send('City is required!'); }
        if (!preferred_location) { return res.status(400).send('Preferred Location is required!'); }
        if (!availability) { return res.status(400).send('Availability is required!'); }
        if (!experience) { return res.status(400).send('Experience is required!'); }
        if (!position) { return res.status(400).send('Position is required!'); }
        if (!right_to_work) { return res.status(400).send('Right to work is required!'); }


        let checkPhone = await Employee.findOne({ phone });
        if (checkPhone) { return res.status(400).send('Phone number already exists. Use different one.'); };



        let newData = new Employee({
            management,
            name,
            phone,
            alt_phone,
            address,
            city,
            preferred_location,
            availability,
            experience,
            position,
            right_to_work,
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
        let employees = req.body;

        if (!Array.isArray(employees) || employees.length === 0) {
            return res.status(400).send('Invalid or empty data array.');
        }

        let validEmployees = [];
        for (let emp of employees) {
            const {
                management,
                name,
                phone,
                alt_phone,
                address,
                city,
                preferred_location,
                availability,
                experience,
                position,
                right_to_work,
                remark,
            } = emp;

            if (!management || !name || !phone || !address || !city || !availability || !experience || !position || !right_to_work) {
                console.log(`Skipped invalid entry: ${name || 'Unnamed'}`);
                continue;
            }

            const exists = await Employee.findOne({ phone });
            if (exists) {
                console.log(`⚠️ Skipped duplicate phone: ${phone}`);
                continue;
            }

            validEmployees.push({
                management,
                name,
                phone,
                alt_phone,
                address,
                city,
                preferred_location,
                availability,
                experience,
                position,
                right_to_work,
                remark,
            });
        }

        if (validEmployees.length === 0) {
            return res.status(400).send('No valid data to import.');
        }

        await Employee.insertMany(validEmployees, { ordered: false });
        res.status(200).send(`${validEmployees.length} employees imported successfully.`);

        console.log(`✅ Imported ${validEmployees.length} employees.`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Bulk import failed.');
    }
};








let View = async (req, res) => {
    let viewOne = await Employee.findById(req.params.id);
    res.send(viewOne)
}




let Update = async (req, res) => {
    try {
        let { management, name, phone, alt_phone, address, city, preferred_location, availability, experience, position, right_to_work, remark } = req.body;

        if (!management) { return res.status(400).send('Management is required!'); }
        if (!name) { return res.status(400).send('Employee Name is required!'); }
        if (!phone) { return res.status(400).send('Phone is required!'); }
        if (!address) { return res.status(400).send('Address is required!'); }
        if (!city) { return res.status(400).send('City is required!'); }
        if (!preferred_location) { return res.status(400).send('Preferred Location is required!'); }
        if (!availability) { return res.status(400).send('Availability is required!'); }
        if (!experience) { return res.status(400).send('Experience is required!'); }
        if (!position) { return res.status(400).send('Position is required!'); }
        if (!right_to_work) { return res.status(400).send('Right to work is required!'); }


        let checkPhone = await Employee.findOne({ phone: phone, _id: { $ne: req.params.id } });
        if (checkPhone) { return res.status(400).send('Phone number already exists. Use different one.'); }


        let updateData = await Employee.findById(req.params.id);

        updateData.management = management;
        updateData.name = name;
        updateData.phone = phone;
        updateData.alt_phone = alt_phone;
        updateData.address = address;
        updateData.preferred_location = preferred_location;
        updateData.city = city;
        updateData.availability = availability;
        updateData.experience = experience;
        updateData.position = position;
        updateData.right_to_work = right_to_work;
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
    await Employee.findByIdAndDelete(req.params.id);
    res.status(200).send('Deleted')
}




module.exports = { Employees, Create, BulkImport, View, Update, Delete }