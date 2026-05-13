const Express = require("express");
const Route = Express.Router();
const asyncHandler = require('../../Middlewares/Async_Handler');
const validateObjectId = require('../../Middlewares/Validate_ObjectId');
const authorize = require('../../Middlewares/Authorize');
const { Users, UserOptions, Create, View, Update, Delete } = require('./User_Controller')


Route.param('id', validateObjectId('id'));

Route.get('/', authorize('Admin'), asyncHandler(Users))
Route.get('/options', authorize('Admin', 'Management', 'Surveyor', 'Designer'), asyncHandler(UserOptions))
Route.post('/', authorize('Admin'), asyncHandler(Create))
Route.get('/:id', authorize('Admin'), asyncHandler(View))
Route.patch('/:id', authorize('Admin'), asyncHandler(Update))
Route.delete('/:id', authorize('Admin'), asyncHandler(Delete))







module.exports = Route
