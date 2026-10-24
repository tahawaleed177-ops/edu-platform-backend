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

// 4. تحديث بيانات الملف الشخصي (الاسم، الدراسة، الشعبة)
router.put('/profile', verifyToken, userController.updateProfile);

// 5. تغيير كلمة المرور
router.put('/change-password', verifyToken, userController.changePassword);

// 6. جلب مواعيد الامتحانات والمهام القادمة (متاح للطلاب والمديرين)
router.get('/deadlines', verifyToken, userController.getDeadlines);


// === المسارات المحمية للمديرين فقط ===

// 7. مسار إدارة المشرفين
router.put('/admin-role', verifyToken, verifyAdmin, userController.toggleAdminRole);

// 8. جلب الطلاب حسب الشعبة لنظام الحضور
router.get('/section/:section', verifyToken, verifyAdmin, userController.getStudentsBySection);

// 9. إضافة موعد امتحان أو مهمة جديدة
router.post('/deadlines', verifyToken, verifyAdmin, userController.createDeadline);

// 10. حذف موعد امتحان أو مهمة
router.delete('/deadlines/:id', verifyToken, verifyAdmin, userController.deleteDeadline);

// 11. مسار تسليم الواجبات للطالب
router.post('/deadlines/:id/submit', verifyToken, userController.submitAssignment);

// 12. مسار عرض التسليمات للمدير
router.get('/deadlines/:id/submissions', verifyToken, verifyAdmin, userController.getAssignmentSubmissions);

module.exports = router;