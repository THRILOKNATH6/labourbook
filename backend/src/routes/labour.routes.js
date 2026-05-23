const express = require('express');
const { 
  createLabour, 
  getLabours, 
  getLabourById, 
  updateLabour, 
  deleteLabour,
  assignLabour
} = require('../controllers/labour.controller');
const { 
  createLabourValidation, 
  updateLabourValidation 
} = require('../validations/labour.validation');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .post(upload.single('photo'), createLabourValidation, createLabour)
  .get(getLabours);

router.route('/:id')
  .get(getLabourById)
  .put(upload.single('photo'), updateLabourValidation, updateLabour)
  .delete(deleteLabour);

router.put('/:id/assign', assignLabour);

module.exports = router;
