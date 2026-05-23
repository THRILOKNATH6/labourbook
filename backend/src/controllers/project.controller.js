const { validationResult } = require('express-validator');
const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response.utils');

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, 'Validation Error', errors.array());
    }

    const { name, description, location, start_date, status } = req.body;
    const created_by = req.user.id;

    const query = `
      INSERT INTO projects (name, description, location, start_date, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [name, description, location, start_date, status || 'active', created_by];

    const result = await db.query(query, values);

    sendSuccess(res, 201, 'Project created successfully', {
      project: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res, next) => {
  try {
    const query = `
      SELECT p.*, a.name as created_by_name 
      FROM projects p
      LEFT JOIN admins a ON p.created_by = a.id
      ORDER BY p.created_at DESC
    `;
    const result = await db.query(query);

    sendSuccess(res, 200, 'Projects retrieved successfully', {
      projects: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT p.*, a.name as created_by_name 
      FROM projects p
      LEFT JOIN admins a ON p.created_by = a.id
      WHERE p.id = $1
    `;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Project not found');
    }

    sendSuccess(res, 200, 'Project retrieved successfully', {
      project: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, 'Validation Error', errors.array());
    }

    const { id } = req.params;
    const { name, description, location, start_date, status } = req.body;

    // Check if project exists
    const checkResult = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Project not found');
    }

    const query = `
      UPDATE projects 
      SET name = COALESCE($1, name), 
          description = COALESCE($2, description), 
          location = COALESCE($3, location), 
          start_date = COALESCE($4, start_date), 
          status = COALESCE($5, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;
    const values = [name, description, location, start_date, status, id];

    const result = await db.query(query, values);

    // Release labours and contractors if project is completed, cancelled, or on_hold
    if (status && ['completed', 'cancelled', 'on_hold'].includes(status)) {
      await db.query('UPDATE labours SET project_id = NULL WHERE project_id = $1', [id]);
      await db.query('UPDATE contractors SET project_id = NULL WHERE project_id = $1', [id]);
    }

    sendSuccess(res, 200, 'Project updated successfully', {
      project: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if project exists
    const checkResult = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Project not found');
    }

    await db.query('DELETE FROM projects WHERE id = $1', [id]);

    sendSuccess(res, 200, 'Project deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
