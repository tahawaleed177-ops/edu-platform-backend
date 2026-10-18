const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
// استدعاء حارس التحقق من الهوية من ملف الميدل وير
const { verifyToken } = require('../middleware/authMiddleware'); 

// 1. المسار لإنشاء مستخدم جديد (Register)
router.post('/register', userController.createUser);

// 2. المسار لتسجيل الدخول (Login)
router.post('/login', userController.loginUser);

// 3. المسار لجلب جميع المستخدمين
router.get('/', userController.getAllUsers);

// === المسارات الجديدة للملف الشخصي (محمية بـ verifyToken) ===

// 4. تحديث بيانات الملف الشخصي (الاسم)
router.put('/profile', verifyToken, userController.updateProfile);

// 5. تغيير كلمة المرور
router.put('/change-password', verifyToken, userController.changePassword);


// 6. مسار إدارة المشرفين (محمي بـ verifyToken و verifyAdmin معاً)
router.put('/admin-role', verifyToken, verifyAdmin, userController.toggleAdminRole); 
module.exports = router;