const { body } = require('express-validator');

const createContractorValidation = [
  body('project_id').notEmpty().withMessage('Project ID is required').isUUID(),
  body('name').notEmpty().withMessage('Contractor name is required').trim(),
  body('phone').notEmpty().withMessage('Phone number is required').trim(),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
];

const updateContractorValidation = [
  body('name').optional().notEmpty().withMessage('Contractor name cannot be empty').trim(),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty').trim(),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
];

module.exports = {
  createContractorValidation,
  updateContractorValidation,
};
