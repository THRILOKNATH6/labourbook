const express = require('express');
const { 
  markAttendance, 
  markBulkAttendance, 
  markContractorAttendance,
  getAttendance, 
  getMonthlyReport,
  getLabourMonthlyDetail,
  getContractorMonthlyReport,
  getContractorMonthlyDetail,
  getDailyExpenditureReport
} = require('../controllers/attendance.controller');
const { 
  markAttendanceValidation, 
  bulkAttendanceValidation 
} = require('../validations/attendance.validation');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .post(markAttendanceValidation, markAttendance)
  .get(getAttendance);

router.post('/bulk', bulkAttendanceValidation, markBulkAttendance);
router.post('/contractor', markContractorAttendance);
router.get('/monthly', getMonthlyReport);
router.get('/contractor/monthly', getContractorMonthlyReport);
router.get('/contractor/:contractor_id/monthly', getContractorMonthlyDetail);
router.get('/labour/:labour_id/monthly', getLabourMonthlyDetail);
router.get('/daily-expenditure', getDailyExpenditureReport);

module.exports = router;
