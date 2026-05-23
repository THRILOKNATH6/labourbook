const express = require('express');
const { createShift, getShifts } = require('../controllers/shift.controller');
const { createShiftValidation } = require('../validations/shift.validation');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);
router.route('/')
  .post(createShiftValidation, createShift)
  .get(getShifts);

module.exports = router;
