const Express = require('express');
const Route = Express.Router();
const asyncHandler = require('../../Middlewares/Async_Handler');
const validateObjectId = require('../../Middlewares/Validate_ObjectId');
const authorize = require('../../Middlewares/Authorize');
const { Professionals, Meta, Create, View, Update, AddNote, MakeAsClient, Delete } = require('./Professional_Controller');

Route.param('id', validateObjectId('id'));

Route.get('/', authorize('Admin', 'Management', 'Surveyor'), asyncHandler(Professionals));
Route.get('/meta', authorize('Admin', 'Management', 'Surveyor'), asyncHandler(Meta));
Route.post('/', authorize('Admin', 'Management', 'Surveyor'), asyncHandler(Create));
Route.get('/:id', authorize('Admin', 'Management', 'Surveyor'), asyncHandler(View));
Route.patch('/:id', authorize('Admin', 'Management', 'Surveyor'), asyncHandler(Update));
Route.patch('/:id/notes', authorize('Admin', 'Management', 'Surveyor'), asyncHandler(AddNote));
Route.patch('/:id/make-client', authorize('Admin', 'Management', 'Surveyor'), asyncHandler(MakeAsClient));
Route.delete('/:id', authorize('Admin'), asyncHandler(Delete));

module.exports = Route;
