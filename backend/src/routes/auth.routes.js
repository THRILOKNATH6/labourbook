const express = require('express');
const { login, getProfile } = require('../controllers/auth.controller');
const { loginValidation } = require('../validations/auth.validation');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/login', loginValidation, login);
router.get('/profile', protect, getProfile);

module.exports = router;
