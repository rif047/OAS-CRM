const Express = require('express');
const Route = Express.Router();


const Lead = require('./API/Lead/Lead_Route.js');
const Employee = require('./API/Employee/Employee_Route.js');
const Client = require('./API/Client/Client_Route.js');
const User = require('./API/User/User_Route.js');


Route.get('/', (req, res) => res.send('Server Running'));


Route.use('/leads', Lead);

Route.use('/employees', Employee);

Route.use('/clients', Client);

Route.use('/users', User);


Route.use((err, req, res, next) => {
    console.error('Error in routes:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = Route;
