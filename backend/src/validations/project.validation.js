const { body } = require('express-validator');

const createProjectValidation = [
  body('name').notEmpty().withMessage('Project name is required').trim(),
  body('location').notEmpty().withMessage('Location is required').trim(),
  body('start_date').isISO8601().withMessage('Valid start date is required').toDate(),
  body('status').optional().isIn(['active', 'completed', 'on_hold', 'cancelled']).withMessage('Invalid status'),
];

const updateProjectValidation = [
  body('name').optional().notEmpty().withMessage('Project name cannot be empty').trim(),
  body('location').optional().notEmpty().withMessage('Location cannot be empty').trim(),
  body('start_date').optional().isISO8601().withMessage('Valid start date is required').toDate(),
  body('status').optional().isIn(['active', 'completed', 'on_hold', 'cancelled']).withMessage('Invalid status'),
];

module.exports = {
  createProjectValidation,
  updateProjectValidation,
};
