const Express = require("express");
const Route = Express.Router();
const asyncHandler = require('../../Middlewares/Async_Handler');
const validateObjectId = require('../../Middlewares/Validate_ObjectId');
const authorize = require('../../Middlewares/Authorize');
const { Users, Create, View, Update, Delete } = require('./User_Controller')


Route.param('id', validateObjectId('id'));

Route.get('/', authorize('Admin', 'Management'), asyncHandler(Users))
Route.post('/', authorize('Admin'), asyncHandler(Create))
Route.get('/:id', authorize('Admin', 'Management'), asyncHandler(View))
Route.patch('/:id', authorize('Admin'), asyncHandler(Update))
Route.delete('/:id', authorize('Admin'), asyncHandler(Delete))







module.exports = Route
