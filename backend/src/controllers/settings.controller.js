const db = require('../config/db');
const { sendSuccess } = require('../utils/response.utils');
const bcrypt = require('bcryptjs');

const getSettings = async (req, res, next) => {
  try {
    const result = await db.query(`SELECT key, value FROM settings`);
    const settings = {};
    result.rows.forEach(r => settings[r.key] = r.value);
    
    // Default fallback if not in DB
    if (settings['lock_attendance_date'] === undefined) {
      settings['lock_attendance_date'] = 'false';
    }
    
    sendSuccess(res, 200, 'Settings fetched', { settings });
  } catch (error) {
    if (error.code === '42P01') { // table does not exist
      await db.query(`
        CREATE TABLE settings (
            key VARCHAR(50) PRIMARY KEY,
            value VARCHAR(255) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO settings (key, value) VALUES ('lock_attendance_date', 'false');
      `);
      sendSuccess(res, 200, 'Settings fetched', { settings: { lock_attendance_date: 'false' } });
    } else {
      next(error);
    }
  }
};

const updateSetting = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    await db.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
      [key, String(value)]
    );
    sendSuccess(res, 200, 'Setting updated', { key, value });
  } catch (error) {
    next(error);
  }
};

const validatePassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const result = await db.query('SELECT password FROM admins WHERE id = $1', [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const isMatch = await bcrypt.compare(password, result.rows[0].password);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    sendSuccess(res, 200, 'Password validated', { valid: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSettings, updateSetting, validatePassword };
