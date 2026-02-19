const Express = require("express");
const Route = Express.Router();
const asyncHandler = require('../../Middlewares/Async_Handler');
const validateObjectId = require('../../Middlewares/Validate_ObjectId');
const authorize = require('../../Middlewares/Authorize');
const { Employees, Create, BulkImport, View, Update, Delete } = require('./Employee_Controller')



Route.param('id', validateObjectId('id'));

Route.get('/', asyncHandler(Employees))
Route.post('/', asyncHandler(Create))
Route.post('/bulk', asyncHandler(BulkImport));
Route.get('/:id', asyncHandler(View))
Route.patch('/:id', asyncHandler(Update))
Route.delete('/:id', authorize('Admin'), asyncHandler(Delete))







module.exports = Route
