const { validationResult } = require('express-validator');
const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response.utils');

// @desc    Create a new labour
// @route   POST /api/labours
// @access  Private
const createLabour = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, 'Validation Error', errors.array());
    }

    const { 
      project_id, contractor_id, full_name, father_name, phone, aadhaar_number, 
      address, gender, dob, skill_type, daily_wage, joining_date, work_type, 
      shift_type, bank_name, account_number, ifsc_code, upi_id, payment_preference, 
      emergency_contact, notes, status 
    } = req.body;
    const created_by = req.user.id;

    // Check project status
    const projectRes = await db.query('SELECT status FROM projects WHERE id = $1', [project_id]);
    const project = projectRes.rows[0];
    if (!project) return sendError(res, 404, 'Project not found');
    if (['completed', 'cancelled', 'on_hold'].includes(project.status)) {
      return sendError(res, 400, `Cannot create labour. Project is ${project.status.replace('_', ' ')}.`);
    }

    const photo_url = req.file ? `/uploads/profiles/${req.file.filename}` : null;

    const query = `
      INSERT INTO labours (
        project_id, contractor_id, full_name, father_name, phone, aadhaar_number, 
        address, gender, dob, photo_url, skill_type, daily_wage, joining_date, work_type, 
        shift_type, bank_name, account_number, ifsc_code, upi_id, payment_preference, 
        emergency_contact, notes, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *
    `;
    const values = [
      project_id, contractor_id || null, full_name, father_name, phone, aadhaar_number, 
      address, gender, dob || null, photo_url, skill_type, daily_wage || null, joining_date || null, work_type, 
      shift_type, bank_name, account_number, ifsc_code, upi_id, payment_preference, 
      emergency_contact, notes, status || 'active', created_by
    ];

    const result = await db.query(query, values);

    sendSuccess(res, 201, 'Labour created successfully', {
      labour: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique violation for aadhaar
      return sendError(res, 400, 'Aadhaar number already registered');
    }
    next(error);
  }
};

// @desc    Get all labours (with pagination and filtering)
// @route   GET /api/labours
// @access  Private
const getLabours = async (req, res, next) => {
  try {
    const { project_id, unassigned, contractor_id, search, limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT l.*, c.name as contractor_name, p.name as project_name 
      FROM labours l
      LEFT JOIN contractors c ON l.contractor_id = c.id
      LEFT JOIN projects p ON l.project_id = p.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (unassigned === 'true') {
      query += ` AND l.project_id IS NULL`;
    } else if (project_id) {
      query += ` AND l.project_id = $${paramCount}`;
      values.push(project_id);
      paramCount++;
    }
    if (contractor_id) {
      query += ` AND l.contractor_id = $${paramCount}`;
      values.push(contractor_id);
      paramCount++;
    }
    if (search) {
      query += ` AND (l.full_name ILIKE $${paramCount} OR l.phone ILIKE $${paramCount} OR l.aadhaar_number ILIKE $${paramCount})`;
      values.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY l.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await db.query(query, values);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM labours WHERE 1=1`;
    const countValues = [];
    let cp = 1;
    if (unassigned === 'true') {
      countQuery += ` AND project_id IS NULL`;
    } else if (project_id) {
      countQuery += ` AND project_id = $${cp}`;
      countValues.push(project_id);
      cp++;
    }
    if (contractor_id) { countQuery += ` AND contractor_id = $${cp}`; countValues.push(contractor_id); cp++; }
    if (search) { 
      countQuery += ` AND (full_name ILIKE $${cp} OR phone ILIKE $${cp} OR aadhaar_number ILIKE $${cp})`;
      countValues.push(`%${search}%`);
    }
    const countResult = await db.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    sendSuccess(res, 200, 'Labours retrieved successfully', {
      labours: result.rows,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get labour by ID
// @route   GET /api/labours/:id
// @access  Private
const getLabourById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT l.*, c.name as contractor_name 
      FROM labours l
      LEFT JOIN contractors c ON l.contractor_id = c.id
      WHERE l.id = $1
    `;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Labour not found');
    }

    sendSuccess(res, 200, 'Labour retrieved successfully', {
      labour: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update labour
// @route   PUT /api/labours/:id
// @access  Private
const updateLabour = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, 'Validation Error', errors.array());
    }

    const { id } = req.params;
    const { 
      contractor_id, full_name, father_name, phone, aadhaar_number, 
      address, gender, dob, skill_type, daily_wage, joining_date, work_type, 
      shift_type, bank_name, account_number, ifsc_code, upi_id, payment_preference, 
      emergency_contact, notes, status 
    } = req.body;

    const checkResult = await db.query('SELECT * FROM labours WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Labour not found');
    }

    // Check project status
    const projectRes = await db.query('SELECT status FROM projects WHERE id = $1', [checkResult.rows[0].project_id]);
    const project = projectRes.rows[0];
    if (project && ['completed', 'cancelled', 'on_hold'].includes(project.status)) {
      return sendError(res, 400, `Cannot update labour. Project is ${project.status.replace('_', ' ')}.`);
    }

    const photo_url = req.file ? `/uploads/profiles/${req.file.filename}` : checkResult.rows[0].photo_url;

    const query = `
      UPDATE labours 
      SET contractor_id = COALESCE($1, contractor_id), 
          full_name = COALESCE($2, full_name), 
          father_name = COALESCE($3, father_name), 
          phone = COALESCE($4, phone), 
          aadhaar_number = COALESCE($5, aadhaar_number),
          address = COALESCE($6, address),
          gender = COALESCE($7, gender),
          dob = COALESCE($8, dob),
          photo_url = $9,
          skill_type = COALESCE($10, skill_type),
          daily_wage = COALESCE($11, daily_wage),
          joining_date = COALESCE($12, joining_date),
          work_type = COALESCE($13, work_type),
          shift_type = COALESCE($14, shift_type),
          bank_name = COALESCE($15, bank_name),
          account_number = COALESCE($16, account_number),
          ifsc_code = COALESCE($17, ifsc_code),
          upi_id = COALESCE($18, upi_id),
          payment_preference = COALESCE($19, payment_preference),
          emergency_contact = COALESCE($20, emergency_contact),
          notes = COALESCE($21, notes),
          status = COALESCE($22, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $23
      RETURNING *
    `;
    const values = [
      contractor_id || null, full_name, father_name, phone, aadhaar_number, 
      address, gender, dob || null, photo_url, skill_type, daily_wage || null, joining_date || null, work_type, 
      shift_type, bank_name, account_number, ifsc_code, upi_id, payment_preference, 
      emergency_contact, notes, status, id
    ];

    const result = await db.query(query, values);

    sendSuccess(res, 200, 'Labour updated successfully', {
      labour: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return sendError(res, 400, 'Aadhaar number already registered');
    }
    next(error);
  }
};

// @desc    Delete labour
// @route   DELETE /api/labours/:id
// @access  Private
const deleteLabour = async (req, res, next) => {
  try {
    const { id } = req.params;

    const checkResult = await db.query('SELECT * FROM labours WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Labour not found');
    }

    // Check project status
    const projectRes = await db.query('SELECT status FROM projects WHERE id = $1', [checkResult.rows[0].project_id]);
    const project = projectRes.rows[0];
    if (project && ['completed', 'cancelled', 'on_hold'].includes(project.status)) {
      return sendError(res, 400, `Cannot delete labour. Project is ${project.status.replace('_', ' ')}.`);
    }

    await db.query('DELETE FROM labours WHERE id = $1', [id]);

    sendSuccess(res, 200, 'Labour deleted successfully');
  } catch (error) {
    next(error);
  }
};

const assignLabour = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { project_id } = req.body;

    if (!project_id) {
      return sendError(res, 400, 'Project ID is required');
    }

    // Check if project exists and is active
    const projectCheck = await db.query('SELECT status FROM projects WHERE id = $1', [project_id]);
    if (projectCheck.rows.length === 0) {
      return sendError(res, 404, 'Project not found');
    }
    const projectStatus = projectCheck.rows[0].status;
    if (['completed', 'cancelled', 'on_hold'].includes(projectStatus)) {
      return sendError(res, 400, `Cannot assign to project. Status is ${projectStatus}.`);
    }

    const result = await db.query(
      'UPDATE labours SET project_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [project_id, id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Labour not found');
    }

    sendSuccess(res, 200, 'Labour assigned to project successfully', {
      labour: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLabour,
  getLabours,
  getLabourById,
  updateLabour,
  deleteLabour,
  assignLabour,
};
