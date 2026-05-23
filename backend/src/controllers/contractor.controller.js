const { validationResult } = require('express-validator');
const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response.utils');

// @desc    Create a new contractor
// @route   POST /api/contractors
// @access  Private
const createContractor = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, 'Validation Error', errors.array());
    }

    const { 
      project_id, name, company_name, phone, email, gst_number, 
      address, labour_capacity, contract_type, commission_type, unit, unit_price, status,
      bank_name, account_number, ifsc_code, upi_id
    } = req.body;

    // Check project status
    const projectCheck = await db.query('SELECT status FROM projects WHERE id = $1', [project_id]);
    if (projectCheck.rows.length > 0) {
      const projectStatus = projectCheck.rows[0].status;
      if (['completed', 'cancelled', 'on_hold'].includes(projectStatus)) {
        return sendError(res, 400, `Project status is ${projectStatus}. Modifying contractors is not allowed.`);
      }
    }

    const created_by = req.user.id;

    // Handle file uploads
    const id_proof_url = req.files?.id_proof ? `/uploads/documents/${req.files.id_proof[0].filename}` : null;
    const agreement_url = req.files?.agreement ? `/uploads/documents/${req.files.agreement[0].filename}` : null;

    const query = `
      INSERT INTO contractors (
        project_id, name, company_name, phone, email, gst_number, 
        address, labour_capacity, contract_type, commission_type, unit, unit_price, status,
        id_proof_url, agreement_url, bank_name, account_number, ifsc_code, upi_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;
    const values = [
      project_id, name, company_name, phone, email, gst_number,
      address, labour_capacity, contract_type, commission_type, unit, unit_price, status || 'active',
      id_proof_url, agreement_url, bank_name, account_number, ifsc_code, upi_id, created_by
    ];

    const result = await db.query(query, values);

    sendSuccess(res, 201, 'Contractor created successfully', {
      contractor: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all contractors (with pagination and filtering)
// @route   GET /api/contractors
// @access  Private
const getContractors = async (req, res, next) => {
  try {
    const { project_id, unassigned, search, limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, a.name as created_by_name 
      FROM contractors c
      LEFT JOIN admins a ON c.created_by = a.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (unassigned === 'true') {
      query += ` AND c.project_id IS NULL`;
    } else if (project_id) {
      query += ` AND c.project_id = $${paramCount}`;
      values.push(project_id);
      paramCount++;
    }

    if (search) {
      query += ` AND (c.name ILIKE $${paramCount} OR c.company_name ILIKE $${paramCount} OR c.phone ILIKE $${paramCount})`;
      values.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await db.query(query, values);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM contractors WHERE 1=1`;
    const countValues = [];
    let cp = 1;
    if (unassigned === 'true') {
      countQuery += ` AND project_id IS NULL`;
    } else if (project_id) {
      countQuery += ` AND project_id = $${cp}`;
      countValues.push(project_id);
      cp++;
    }
    if (search) { 
      countQuery += ` AND (name ILIKE $${cp} OR company_name ILIKE $${cp} OR phone ILIKE $${cp})`;
      countValues.push(`%${search}%`);
    }
    const countResult = await db.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    sendSuccess(res, 200, 'Contractors retrieved successfully', {
      contractors: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get contractor by ID
// @route   GET /api/contractors/:id
// @access  Private
const getContractorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT c.*, a.name as created_by_name 
      FROM contractors c
      LEFT JOIN admins a ON c.created_by = a.id
      WHERE c.id = $1
    `;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Contractor not found');
    }

    sendSuccess(res, 200, 'Contractor retrieved successfully', {
      contractor: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update contractor
// @route   PUT /api/contractors/:id
// @access  Private
const updateContractor = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, 'Validation Error', errors.array());
    }

    const { id } = req.params;
    const { 
      name, company_name, phone, email, gst_number, 
      address, labour_capacity, contract_type, commission_type, unit, unit_price, status,
      bank_name, account_number, ifsc_code, upi_id
    } = req.body;

    const checkResult = await db.query('SELECT * FROM contractors WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Contractor not found');
    }

    // Check project status
    const projectCheck = await db.query(
      'SELECT p.status FROM projects p JOIN contractors c ON c.project_id = p.id WHERE c.id = $1',
      [id]
    );
    if (projectCheck.rows.length > 0) {
      const projectStatus = projectCheck.rows[0].status;
      if (['completed', 'cancelled', 'on_hold'].includes(projectStatus)) {
        return sendError(res, 400, `Project status is ${projectStatus}. Modifying contractors is not allowed.`);
      }
    }

    // Handle file uploads (only update if new file provided)
    const id_proof_url = req.files?.id_proof ? `/uploads/documents/${req.files.id_proof[0].filename}` : checkResult.rows[0].id_proof_url;
    const agreement_url = req.files?.agreement ? `/uploads/documents/${req.files.agreement[0].filename}` : checkResult.rows[0].agreement_url;

    const query = `
      UPDATE contractors 
      SET name = COALESCE($1, name), 
          company_name = COALESCE($2, company_name), 
          phone = COALESCE($3, phone), 
          email = COALESCE($4, email), 
          gst_number = COALESCE($5, gst_number),
          address = COALESCE($6, address),
          labour_capacity = COALESCE($7, labour_capacity),
          contract_type = COALESCE($8, contract_type),
          commission_type = COALESCE($9, commission_type),
          unit = COALESCE($10, unit),
          unit_price = COALESCE($11, unit_price),
          status = COALESCE($12, status),
          id_proof_url = $13,
          agreement_url = $14,
          bank_name = COALESCE($15, bank_name),
          account_number = COALESCE($16, account_number),
          ifsc_code = COALESCE($17, ifsc_code),
          upi_id = COALESCE($18, upi_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $19
      RETURNING *
    `;
    const values = [
      name, company_name, phone, email, gst_number, 
      address, labour_capacity, contract_type, commission_type, unit, unit_price, status,
      id_proof_url, agreement_url, bank_name, account_number, ifsc_code, upi_id, id
    ];

    const result = await db.query(query, values);

    sendSuccess(res, 200, 'Contractor updated successfully', {
      contractor: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete contractor
// @route   DELETE /api/contractors/:id
// @access  Private
const deleteContractor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const checkResult = await db.query('SELECT * FROM contractors WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Contractor not found');
    }

    // Check project status
    const projectCheck = await db.query(
      'SELECT p.status FROM projects p JOIN contractors c ON c.project_id = p.id WHERE c.id = $1',
      [id]
    );
    if (projectCheck.rows.length > 0) {
      const projectStatus = projectCheck.rows[0].status;
      if (['completed', 'cancelled', 'on_hold'].includes(projectStatus)) {
        return sendError(res, 400, `Project status is ${projectStatus}. Modifying contractors is not allowed.`);
      }
    }

    await db.query('DELETE FROM contractors WHERE id = $1', [id]);

    sendSuccess(res, 200, 'Contractor deleted successfully');
  } catch (error) {
    next(error);
  }
};

const assignContractor = async (req, res, next) => {
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
      'UPDATE contractors SET project_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [project_id, id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Contractor not found');
    }

    sendSuccess(res, 200, 'Contractor assigned to project successfully', {
      contractor: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createContractor,
  getContractors,
  getContractorById,
  updateContractor,
  deleteContractor,
  assignContractor,
};
