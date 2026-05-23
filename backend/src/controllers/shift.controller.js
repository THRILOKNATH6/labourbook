const { validationResult } = require('express-validator');
const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response.utils');

// @desc    Create a new shift
// @route   POST /api/shifts
// @access  Private
const createShift = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 400, 'Validation Error', errors.array());

    const { project_id, shift_name, start_time, end_time } = req.body;

    // Calculate default working hours for shift
    const [inH, inM] = start_time.split(':').map(Number);
    const [outH, outM] = end_time.split(':').map(Number);
    let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const working_hours = Number((totalMinutes / 60).toFixed(2));

    const query = `
      INSERT INTO shifts (project_id, shift_name, start_time, end_time, working_hours)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await db.query(query, [project_id, shift_name, start_time, end_time, working_hours]);

    sendSuccess(res, 201, 'Shift created successfully', { shift: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// @desc    Get shifts for a project
// @route   GET /api/shifts
// @access  Private
const getShifts = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    let query = 'SELECT * FROM shifts WHERE 1=1';
    const values = [];

    if (project_id) {
      query += ' AND project_id = $1';
      values.push(project_id);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, values);
    sendSuccess(res, 200, 'Shifts retrieved', { shifts: result.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createShift,
  getShifts
};
