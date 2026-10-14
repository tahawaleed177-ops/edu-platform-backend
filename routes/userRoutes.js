const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// 1. المسار لإنشاء مستخدم جديد (Register)
router.post('/register', userController.createUser);

// 2. المسار لتسجيل الدخول (Login)
router.post('/login', userController.loginUser);

// 3. المسار لجلب جميع المستخدمين
router.get('/', userController.getAllUsers);

module.exports = router;