const Express = require("express");
const Route = Express.Router();
const { Employees, Create, BulkImport, View, Update, Delete } = require('./Employee_Controller')



Route.get('/', Employees)
Route.post('/', Create)
Route.post('/bulk', BulkImport);
Route.get('/:id', View)
Route.patch('/:id', Update)
Route.delete('/:id', Delete)







module.exports = Route