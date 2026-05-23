const { body } = require('express-validator');

const createLabourValidation = [
  body('project_id').notEmpty().withMessage('Project ID is required').isUUID(),
  body('full_name').notEmpty().withMessage('Full name is required').trim(),
  body('phone').notEmpty().withMessage('Phone number is required').trim(),
  body('daily_wage').optional().isNumeric().withMessage('Daily wage must be a number'),
  body('status').optional().isIn(['active', 'inactive', 'terminated']).withMessage('Invalid status'),
];

const updateLabourValidation = [
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty').trim(),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty').trim(),
  body('daily_wage').optional().isNumeric().withMessage('Daily wage must be a number'),
  body('status').optional().isIn(['active', 'inactive', 'terminated']).withMessage('Invalid status'),
];

module.exports = {
  createLabourValidation,
  updateLabourValidation,
};
