const { validationResult } = require('express-validator');
const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response.utils');
const { calculateHours } = require('../services/attendance.service');

// @desc    Mark single attendance
// @route   POST /api/attendance
// @access  Private
const markAttendance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 400, 'Validation Error', errors.array());

    const { project_id, labour_id, contractor_id, attendance_date, status, check_in, check_out, shift_type, remarks, ot_hours: req_ot_hours, ot_rate, ot_note, advance_amount, advance_mode, advance_transaction_id } = req.body;
    const marked_by = req.user.id;

    // Check project status
    const projectRes = await db.query('SELECT status FROM projects WHERE id = $1', [project_id]);
    const project = projectRes.rows[0];
    if (!project) return sendError(res, 404, 'Project not found');
    if (['completed', 'cancelled', 'on_hold'].includes(project.status)) {
      return sendError(res, 400, `Cannot mark attendance. Project is ${project.status.replace('_', ' ')}.`);
    }

    // Calculate hours
    const { workingHours, otHours: calculatedOtHours } = calculateHours(check_in, check_out, status);
    const otHours = req_ot_hours !== undefined ? req_ot_hours : calculatedOtHours;

    const query = `
      INSERT INTO attendance (
        project_id, labour_id, contractor_id, attendance_date, status, 
        check_in, check_out, working_hours, ot_hours, ot_rate, ot_note, 
        advance_amount, advance_mode, advance_transaction_id,
        shift_type, remarks, marked_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (labour_id, attendance_date) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        check_in = EXCLUDED.check_in,
        check_out = EXCLUDED.check_out,
        working_hours = EXCLUDED.working_hours,
        ot_hours = EXCLUDED.ot_hours,
        ot_rate = EXCLUDED.ot_rate,
        ot_note = EXCLUDED.ot_note,
        advance_amount = EXCLUDED.advance_amount,
        advance_mode = EXCLUDED.advance_mode,
        advance_transaction_id = EXCLUDED.advance_transaction_id,
        shift_type = EXCLUDED.shift_type,
        remarks = EXCLUDED.remarks,
        marked_by = EXCLUDED.marked_by
      RETURNING *
    `;
    const values = [
      project_id, labour_id, contractor_id || null, attendance_date, status,
      check_in || null, check_out || null, workingHours, otHours, ot_rate || 0, ot_note || null, 
      advance_amount || 0, advance_mode || 'Cash', advance_transaction_id || null,
      shift_type || null, remarks, marked_by
    ];

    const result = await db.query(query, values);

    sendSuccess(res, 201, 'Attendance marked successfully', {
      attendance: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark bulk attendance
// @route   POST /api/attendance/bulk
// @access  Private
const markBulkAttendance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 400, 'Validation Error', errors.array());

    const { project_id, attendance_date, records } = req.body;
    const marked_by = req.user.id;

    // Check project status
    const projectRes = await db.query('SELECT status FROM projects WHERE id = $1', [project_id]);
    const project = projectRes.rows[0];
    if (!project) return sendError(res, 404, 'Project not found');
    if (['completed', 'cancelled', 'on_hold'].includes(project.status)) {
      return sendError(res, 400, `Cannot mark attendance. Project is ${project.status.replace('_', ' ')}.`);
    }

    const results = [];

    // Use a transaction for bulk insert
    await db.query('BEGIN');

    for (const record of records) {
      const { labour_id, contractor_id, status, check_in, check_out, shift_type, remarks, ot_hours: req_ot_hours, ot_rate, ot_note, advance_amount, advance_mode, advance_transaction_id } = record;
      const { workingHours, otHours: calculatedOtHours } = calculateHours(check_in, check_out, status);
      const otHours = req_ot_hours !== undefined ? req_ot_hours : calculatedOtHours;

      const query = `
        INSERT INTO attendance (
          project_id, labour_id, contractor_id, attendance_date, status, 
          check_in, check_out, working_hours, ot_hours, ot_rate, ot_note, 
          advance_amount, advance_mode, advance_transaction_id,
          shift_type, remarks, marked_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (labour_id, attendance_date) 
        DO UPDATE SET 
          status = EXCLUDED.status,
          check_in = EXCLUDED.check_in,
          check_out = EXCLUDED.check_out,
          working_hours = EXCLUDED.working_hours,
          ot_hours = EXCLUDED.ot_hours,
          ot_rate = EXCLUDED.ot_rate,
          ot_note = EXCLUDED.ot_note,
          advance_amount = EXCLUDED.advance_amount,
          advance_mode = EXCLUDED.advance_mode,
          advance_transaction_id = EXCLUDED.advance_transaction_id,
          shift_type = EXCLUDED.shift_type,
          remarks = EXCLUDED.remarks,
          marked_by = EXCLUDED.marked_by
        RETURNING *
      `;
      const values = [
        project_id, labour_id, contractor_id || null, attendance_date, status,
        check_in || null, check_out || null, workingHours, otHours, ot_rate || 0, ot_note || null, 
        advance_amount || 0, advance_mode || 'Cash', advance_transaction_id || null,
        shift_type || null, remarks, marked_by
      ];

      const res = await db.query(query, values);
      results.push(res.rows[0]);
    }

    await db.query('COMMIT');

    sendSuccess(res, 201, 'Bulk attendance marked successfully', {
      count: results.length
    });
  } catch (error) {
    await db.query('ROLLBACK');
    next(error);
  }
};

// @desc    Mark contractor attendance
// @route   POST /api/attendance/contractor
// @access  Private
const markContractorAttendance = async (req, res, next) => {
  try {
    const { project_id, contractor_id, attendance_date, num_of_labours, worked_units, work_details } = req.body;
    const created_by = req.user.id;

    // Check project status
    const projectRes = await db.query('SELECT status FROM projects WHERE id = $1', [project_id]);
    const project = projectRes.rows[0];
    if (!project) return sendError(res, 404, 'Project not found');
    if (['completed', 'cancelled', 'on_hold'].includes(project.status)) {
      return sendError(res, 400, `Cannot mark contractor attendance. Project is ${project.status.replace('_', ' ')}.`);
    }

    // Fetch current contractor unit and unit_price
    const contractorRes = await db.query(
      'SELECT unit, unit_price FROM contractors WHERE id = $1',
      [contractor_id]
    );
    const contractor = contractorRes.rows[0];
    const unit = contractor ? contractor.unit : null;
    const unit_price = contractor ? contractor.unit_price : null;

    const query = `
      INSERT INTO contractor_attendance (
        project_id, contractor_id, attendance_date, num_of_labours, worked_units, work_details, created_by, unit, unit_price
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (contractor_id, attendance_date) 
      DO UPDATE SET 
        num_of_labours = EXCLUDED.num_of_labours,
        worked_units = EXCLUDED.worked_units,
        work_details = EXCLUDED.work_details,
        created_by = EXCLUDED.created_by,
        unit = EXCLUDED.unit,
        unit_price = EXCLUDED.unit_price,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [
      project_id, 
      contractor_id, 
      attendance_date, 
      num_of_labours || 0, 
      worked_units || 0, 
      work_details ? (typeof work_details === 'string' ? work_details : JSON.stringify(work_details)) : null, 
      created_by,
      unit,
      unit_price
    ];

    const result = await db.query(query, values);

    sendSuccess(res, 201, 'Contractor attendance marked successfully', {
      contractor_attendance: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance for a project on a specific date
// @route   GET /api/attendance
// @access  Private
const getAttendance = async (req, res, next) => {
  try {
    const { project_id, date, contractor_id } = req.query;
    
    let query = `
      SELECT a.*, l.full_name, l.photo_url, l.skill_type, c.name as contractor_name
      FROM attendance a
      JOIN labours l ON a.labour_id = l.id
      LEFT JOIN contractors c ON a.contractor_id = c.id
      WHERE a.project_id = $1 AND a.attendance_date = $2
    `;
    const values = [project_id, date];

    if (contractor_id) {
      query += ` AND a.contractor_id = $3`;
      values.push(contractor_id);
    }

    const result = await db.query(query, values);

    // Fetch contractor attendance for the given date
    let cQuery = `
      SELECT ca.*, c.name as contractor_name, c.company_name, 
             COALESCE(ca.unit, c.unit) as unit, 
             COALESCE(ca.unit_price, c.unit_price) as unit_price
      FROM contractor_attendance ca
      JOIN contractors c ON ca.contractor_id = c.id
      WHERE ca.project_id = $1 AND ca.attendance_date = $2
    `;
    const cValues = [project_id, date];

    if (contractor_id) {
      cQuery += ` AND ca.contractor_id = $3`;
      cValues.push(contractor_id);
    }

    const cResult = await db.query(cQuery, cValues);

    sendSuccess(res, 200, 'Attendance retrieved', {
      attendance: result.rows,
      contractor_attendance: cResult.rows
    });
  } catch (error) {
    next(error);
  }
};

const getDefaultDateRange = () => {
  const today = new Date();
  const day = today.getDay();
  
  const to = new Date(today);
  const from = new Date(today);
  
  const daysSinceLastSaturday = (day + 1) % 7 || 7;
  from.setDate(today.getDate() - daysSinceLastSaturday);
  
  const format = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  
  return {
    from: format(from),
    to: format(to)
  };
};

const resolveDateRange = (query) => {
  let { from, to, month, year } = query;
  if (from && to) {
    return { from, to };
  }
  
  if (month && year) {
    const m = parseInt(month);
    const y = parseInt(year);
    const lastDay = new Date(y, m, 0).getDate();
    const format = (d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return {
      from: format(1),
      to: format(lastDay)
    };
  }
  
  return getDefaultDateRange();
};

// @desc    Get Attendance Report (supports date range and legacy month/year)
// @route   GET /api/attendance/monthly
// @access  Private
const getMonthlyReport = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    const { from, to } = resolveDateRange(req.query);
    
    const query = `
      SELECT 
        l.id as labour_id, l.full_name, l.daily_wage, c.name as contractor_name,
        COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as total_present,
        COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as total_absent,
        COUNT(CASE WHEN a.status = 'Half Day' THEN 1 END) as total_half_day,
        SUM(a.working_hours) as total_working_hours,
        SUM(a.ot_hours) as total_ot_hours,
        SUM(COALESCE(a.ot_hours, 0) * COALESCE(a.ot_rate, 0)) as total_ot_amount,
        SUM(COALESCE(a.advance_amount, 0)) as total_advance_amount
      FROM labours l
      LEFT JOIN attendance a ON l.id = a.labour_id 
        AND a.project_id = $1 
        AND a.attendance_date >= $2
        AND a.attendance_date <= $3
      LEFT JOIN contractors c ON l.contractor_id = c.id
      WHERE l.project_id = $1
      GROUP BY l.id, l.full_name, l.daily_wage, c.name
    `;
    
    const result = await db.query(query, [project_id, from, to]);

    sendSuccess(res, 200, 'Attendance report generated', {
      report: result.rows,
      dateRange: { from, to }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Labour Details for Date Range
// @route   GET /api/attendance/labour/:labour_id/monthly
// @access  Private
const getLabourMonthlyDetail = async (req, res, next) => {
  try {
    const { labour_id } = req.params;
    const { project_id } = req.query;
    const { from, to } = resolveDateRange(req.query);
    
    const query = `
      SELECT * 
      FROM attendance
      WHERE labour_id = $1 
        AND project_id = $2
        AND attendance_date >= $3
        AND attendance_date <= $4
      ORDER BY attendance_date ASC
    `;
    const result = await db.query(query, [labour_id, project_id, from, to]);

    sendSuccess(res, 200, 'Labour details retrieved', {
      details: result.rows,
      dateRange: { from, to }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Contractor Attendance Report for Date Range
// @route   GET /api/attendance/contractor/monthly
// @access  Private
const getContractorMonthlyReport = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    const { from, to } = resolveDateRange(req.query);
    
    const query = `
      SELECT 
        c.id as contractor_id, c.name, c.company_name, c.contract_type,
        COALESCE(ca.unit, c.unit) as unit,
        COALESCE(ca.unit_price, c.unit_price) as unit_price,
        SUM(ca.num_of_labours) as total_labours_provided,
        SUM(ca.worked_units) as total_worked_units
      FROM contractors c
      LEFT JOIN contractor_attendance ca ON c.id = ca.contractor_id 
        AND ca.project_id = $1 
        AND ca.attendance_date >= $2
        AND ca.attendance_date <= $3
      WHERE c.project_id = $1
      GROUP BY c.id, c.name, c.company_name, c.contract_type, COALESCE(ca.unit, c.unit), COALESCE(ca.unit_price, c.unit_price)
    `;
    
    const result = await db.query(query, [project_id, from, to]);

    sendSuccess(res, 200, 'Contractor report generated', {
      report: result.rows,
      dateRange: { from, to }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Detailed logs for a specific contractor in Date Range
// @route   GET /api/attendance/contractor/:contractor_id/monthly
// @access  Private
const getContractorMonthlyDetail = async (req, res, next) => {
  try {
    const { contractor_id } = req.params;
    const { project_id } = req.query;
    const { from, to } = resolveDateRange(req.query);

    const query = `
      SELECT 
        id, attendance_date, num_of_labours, worked_units, work_details, unit, unit_price
      FROM contractor_attendance
      WHERE contractor_id = $1 
        AND project_id = $2
        AND attendance_date >= $3
        AND attendance_date <= $4
      ORDER BY attendance_date ASC
    `;

    const result = await db.query(query, [contractor_id, project_id, from, to]);

    sendSuccess(res, 200, 'Detailed contractor logs fetched', {
      details: result.rows,
      dateRange: { from, to }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Daily Expenditure Report for Date Range
// @route   GET /api/attendance/daily-expenditure
// @access  Private
const getDailyExpenditureReport = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    const { from, to } = resolveDateRange(req.query);

    const labourQuery = `
      SELECT 
        a.attendance_date,
        COUNT(CASE WHEN a.status IN ('Present', 'Half Day') THEN 1 END) as labours_present,
        SUM(
            CASE 
                WHEN a.status = 'Present' THEN COALESCE(l.daily_wage, 0)
                WHEN a.status = 'Half Day' THEN COALESCE(l.daily_wage, 0) * 0.5 
                ELSE 0 
            END
        ) as regular_cost,
        SUM(COALESCE(a.ot_hours, 0) * COALESCE(a.ot_rate, 0)) as ot_cost,
        SUM(COALESCE(a.advance_amount, 0)) as total_advance
      FROM attendance a
      JOIN labours l ON a.labour_id = l.id
      WHERE a.project_id = $1 
        AND a.attendance_date >= $2
        AND a.attendance_date <= $3
      GROUP BY a.attendance_date
      ORDER BY a.attendance_date ASC
    `;

    const contractorQuery = `
      SELECT 
        ca.attendance_date,
        SUM(ca.worked_units * COALESCE(ca.unit_price, c.unit_price, 0)) as contractor_cost
      FROM contractor_attendance ca
      JOIN contractors c ON ca.contractor_id = c.id
      WHERE ca.project_id = $1 
        AND ca.attendance_date >= $2
        AND ca.attendance_date <= $3
      GROUP BY ca.attendance_date
    `;

    const [labourRes, contractorRes] = await Promise.all([
      db.query(labourQuery, [project_id, from, to]),
      db.query(contractorQuery, [project_id, from, to])
    ]);

    // Merge the results by date
    const dailyMap = {};
    
    // Add all days in the range to ensure complete view
    const startDate = new Date(from);
    const endDate = new Date(to);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        dailyMap[dateStr] = {
            date: dateStr,
            labours_present: 0,
            labour_cost: 0,
            ot_cost: 0,
            advance_amount: 0,
            contractor_cost: 0,
            total_expenditure: 0
        };
    }

    labourRes.rows.forEach(row => {
        const dateObj = new Date(row.attendance_date);
        const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;
        if(dailyMap[dateStr]) {
            dailyMap[dateStr].labours_present = Number(row.labours_present) || 0;
            dailyMap[dateStr].labour_cost = Number(row.regular_cost) || 0;
            dailyMap[dateStr].ot_cost = Number(row.ot_cost) || 0;
            dailyMap[dateStr].advance_amount = Number(row.total_advance) || 0;
            dailyMap[dateStr].total_expenditure += dailyMap[dateStr].labour_cost + dailyMap[dateStr].ot_cost;
        }
    });

    contractorRes.rows.forEach(row => {
        const dateObj = new Date(row.attendance_date);
        const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;
        if(dailyMap[dateStr]) {
            dailyMap[dateStr].contractor_cost = Number(row.contractor_cost) || 0;
            dailyMap[dateStr].total_expenditure += dailyMap[dateStr].contractor_cost;
        }
    });

    // Convert map to array and sort by date
    const finalReport = Object.values(dailyMap).sort((a, b) => new Date(a.date) - new Date(b.date));

    sendSuccess(res, 200, 'Daily expenditure report generated', {
      report: finalReport,
      dateRange: { from, to }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markAttendance,
  markBulkAttendance,
  markContractorAttendance,
  getAttendance,
  getMonthlyReport,
  getLabourMonthlyDetail,
  getContractorMonthlyReport,
  getContractorMonthlyDetail,
  getDailyExpenditureReport
};
