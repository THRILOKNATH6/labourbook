const express = require('express');
const { 
  createContractor, 
  getContractors, 
  getContractorById, 
  updateContractor, 
  deleteContractor,
  assignContractor
} = require('../controllers/contractor.controller');
const { 
  createContractorValidation, 
  updateContractorValidation 
} = require('../validations/contractor.validation');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .post(
    upload.fields([{ name: 'id_proof', maxCount: 1 }, { name: 'agreement', maxCount: 1 }]),
    createContractorValidation, 
    createContractor
  )
  .get(getContractors);

router.route('/:id')
  .get(getContractorById)
  .put(
    upload.fields([{ name: 'id_proof', maxCount: 1 }, { name: 'agreement', maxCount: 1 }]),
    updateContractorValidation, 
    updateContractor
  )
  .delete(deleteContractor);

router.put('/:id/assign', assignContractor);

module.exports = router;
