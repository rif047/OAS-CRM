const Express = require("express");
const Route = Express.Router();
const multer = require('multer');
const { Leads, Create, View, Update, Delete, Pending, Closed, Lost_Lead, Comment, UploadDescriptionImages, In_Quote, In_Survey, Survey_Data, In_Design, In_Review } = require('./Lead_Controller')

const leadDescriptionUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 10
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed.'));
        }
        cb(null, true);
    }
});

const handleLeadDescriptionUpload = (req, res, next) => {
    leadDescriptionUpload.array('images', 10)(req, res, (error) => {
        if (!error) return next();
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).send('Each image must be 5MB or less.');
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).send('Maximum 10 images allowed per upload.');
        }
        return res.status(400).send(error.message || 'Invalid image upload.');
    });
};



Route.get('/', Leads)
Route.post('/', Create)
Route.post('/description-images', handleLeadDescriptionUpload, UploadDescriptionImages)
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
Route.patch('/comment/:id', Comment)








module.exports = Route
