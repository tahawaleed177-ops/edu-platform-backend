const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// مسار التسجيل: POST /api/auth/register
router.post('/register', authController.register);

// مسار الدخول: POST /api/auth/login
router.post('/login', authController.login);

module.exports = router;