const { body } = require('express-validator');

const createShiftValidation = [
  body('project_id').notEmpty().withMessage('Project ID is required').isUUID(),
  body('shift_name').notEmpty().withMessage('Shift name is required').trim(),
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be HH:MM format'),
  body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be HH:MM format'),
];

module.exports = {
  createShiftValidation
};
