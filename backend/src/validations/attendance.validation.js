const { body } = require('express-validator');

const markAttendanceValidation = [
  body('project_id').notEmpty().withMessage('Project ID is required').isUUID(),
  body('labour_id').notEmpty().withMessage('Labour ID is required').isUUID(),
  body('attendance_date').isISO8601().withMessage('Valid attendance date is required').toDate(),
  body('status').isIn(['Present', 'Absent', 'Half Day', 'Leave', 'Holiday']).withMessage('Invalid status'),
];

const bulkAttendanceValidation = [
  body('project_id').notEmpty().withMessage('Project ID is required').isUUID(),
  body('attendance_date').isISO8601().withMessage('Valid attendance date is required').toDate(),
  body('records').isArray().withMessage('Records must be an array'),
  body('records.*.labour_id').notEmpty().isUUID(),
  body('records.*.status').isIn(['Present', 'Absent', 'Half Day', 'Leave', 'Holiday'])
];

module.exports = {
  markAttendanceValidation,
  bulkAttendanceValidation
};
