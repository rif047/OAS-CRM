const Express = require("express");
const Route = Express.Router();
const asyncHandler = require('../../Middlewares/Async_Handler');
const validateObjectId = require('../../Middlewares/Validate_ObjectId');
const authorize = require('../../Middlewares/Authorize');
const { Employees, Create, BulkImport, View, Update, Delete } = require('./Employee_Controller')



Route.param('id', validateObjectId('id'));

Route.get('/', authorize('Admin', 'Management'), asyncHandler(Employees))
Route.post('/', authorize('Admin', 'Management'), asyncHandler(Create))
Route.post('/bulk', authorize('Admin', 'Management'), asyncHandler(BulkImport));
Route.get('/:id', authorize('Admin', 'Management'), asyncHandler(View))
Route.patch('/:id', authorize('Admin', 'Management'), asyncHandler(Update))
Route.delete('/:id', authorize('Admin'), asyncHandler(Delete))







module.exports = Route
