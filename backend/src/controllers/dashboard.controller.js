const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response.utils');

const getDashboardStats = async (req, res, next) => {
  try {
    const [projectsCount, activeProjectsCount, laboursCount, contractorsCount] = await Promise.all([
      db.query('SELECT COUNT(*) FROM projects'),
      db.query("SELECT COUNT(*) FROM projects WHERE status = 'active'"),
      db.query('SELECT COUNT(*) FROM labours'),
      db.query('SELECT COUNT(*) FROM contractors')
    ]);

    const stats = {
      totalProjects: parseInt(projectsCount.rows[0].count),
      activeProjects: parseInt(activeProjectsCount.rows[0].count),
      totalLabour: parseInt(laboursCount.rows[0].count),
      totalContractors: parseInt(contractorsCount.rows[0].count)
    };

    sendSuccess(res, 200, 'Dashboard stats retrieved', { stats });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats
};
