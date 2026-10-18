const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// استدعاء حارس التحقق من الهوية وحارس التحقق من المدير
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware'); 

// 1. المسار لإنشاء مستخدم جديد (Register)
router.post('/register', userController.createUser);

// 2. المسار لتسجيل الدخول (Login)
router.post('/login', userController.loginUser);

// 3. المسار لجلب جميع المستخدمين
router.get('/', userController.getAllUsers);

// === المسارات المحمية للمستخدمين العاديين ===

// 4. تحديث بيانات الملف الشخصي (الاسم)
router.put('/profile', verifyToken, userController.updateProfile);

// 5. تغيير كلمة المرور
router.put('/change-password', verifyToken, userController.changePassword);


// === المسارات المحمية للمديرين فقط ===

// 6. مسار إدارة المشرفين (يتطلب verifyToken + verifyAdmin)
router.put('/admin-role', verifyToken, verifyAdmin, userController.toggleAdminRole);

module.exports = router;