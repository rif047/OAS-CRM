const Express = require("express");
const Route = Express.Router();
const { Leads, Create, View, Update, Delete, Pending, Closed, Cancelled, In_Quote, In_Servey, In_Design, In_Review } = require('./Lead_Controller')



Route.get('/', Leads)
Route.post('/', Create)
Route.get('/:id', View)
Route.patch('/:id', Update)
Route.delete('/:id', Delete)
Route.patch('/pending/:id', Pending)
Route.patch('/in_quote/:id', In_Quote)
Route.patch('/in_servey/:id', In_Servey)
Route.patch('/in_design/:id', In_Design)
Route.patch('/in_review/:id', In_Review)
Route.patch('/closed/:id', Closed)
Route.patch('/cancelled/:id', Cancelled)








module.exports = Route