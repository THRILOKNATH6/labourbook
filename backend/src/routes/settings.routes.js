const express = require('express');
const { getSettings, updateSetting, validatePassword } = require('../controllers/settings.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getSettings)
  .post(updateSetting);

router.post('/validate-password', validatePassword);

module.exports = router;
