const Express = require("express");
const Route = Express.Router();
const { Leads, Create, View, Update, Delete, Pending, Closed, Lost_Lead, In_Quote, In_Survey, Survey_Data, In_Design, In_Review } = require('./Lead_Controller')



Route.get('/', Leads)
Route.post('/', Create)
Route.get('/:id', View)
Route.patch('/:id', Update)
Route.delete('/:id', Delete)
Route.patch('/pending/:id', Pending)
Route.patch('/in_quote/:id', In_Quote)
Route.patch('/in_survey/:id', In_Survey)
Route.patch('/survey_data/:id', Survey_Data)
Route.patch('/in_design/:id', In_Design)
Route.patch('/In_review/:id', In_Review)
Route.patch('/closed/:id', Closed)
Route.patch('/lost_lead/:id', Lost_Lead)








module.exports = Route