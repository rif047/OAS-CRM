const Express = require("express");
const Route = Express.Router();
const asyncHandler = require('../../Middlewares/Async_Handler');
const validateObjectId = require('../../Middlewares/Validate_ObjectId');
const authorize = require('../../Middlewares/Authorize');
const { Clients, Create, BulkImport, View, Update, Delete } = require('./Client_Controller')



Route.param('id', validateObjectId('id'));

Route.get('/', authorize('Admin', 'Management', 'Surveyor', 'Designer'), asyncHandler(Clients))
Route.post('/', authorize('Admin', 'Management', 'Surveyor'), asyncHandler(Create))
Route.post('/bulk', authorize('Admin', 'Management'), asyncHandler(BulkImport));
Route.get('/:id', authorize('Admin', 'Management', 'Surveyor', 'Designer'), asyncHandler(View))
Route.patch('/:id', authorize('Admin', 'Management', 'Surveyor'), asyncHandler(Update))
Route.delete('/:id', authorize('Admin'), asyncHandler(Delete))







module.exports = Route
