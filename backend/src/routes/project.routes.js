const express = require('express');
const { 
  createProject, 
  getProjects, 
  getProjectById, 
  updateProject, 
  deleteProject 
} = require('../controllers/project.controller');
const { 
  createProjectValidation, 
  updateProjectValidation 
} = require('../validations/project.validation');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Apply auth middleware to all project routes
router.use(protect);

router.route('/')
  .post(createProjectValidation, createProject)
  .get(getProjects);

router.route('/:id')
  .get(getProjectById)
  .put(updateProjectValidation, updateProject)
  .delete(deleteProject);

module.exports = router;
