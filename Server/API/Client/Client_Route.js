const Express = require("express");
const Route = Express.Router();
const { Clients, Create, BulkImport, View, Update, Delete } = require('./Client_Controller')



Route.get('/', Clients)
Route.post('/', Create)
Route.post('/bulk', BulkImport);
Route.get('/:id', View)
Route.patch('/:id', Update)
Route.delete('/:id', Delete)







module.exports = Route