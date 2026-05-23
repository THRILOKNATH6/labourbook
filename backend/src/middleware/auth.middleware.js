const { verifyToken } = require('../utils/jwt.utils');
const { sendError } = require('../utils/response.utils');
const db = require('../config/db');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 401, 'Not authorized to access this route. Token missing.');
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return sendError(res, 401, 'Not authorized. Invalid token.');
    }

    // Verify user exists and is an admin
    const result = await db.query('SELECT id, name, email, role FROM admins WHERE id = $1', [decoded.id]);
    
    if (result.rows.length === 0) {
      return sendError(res, 401, 'Not authorized. User no longer exists.');
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return sendError(res, 500, 'Internal Server Error in authentication.');
  }
};

module.exports = { protect };
