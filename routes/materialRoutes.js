const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const authMiddleware = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// استخراج دالة التحقق من التوكن بأمان
const verifyToken = typeof authMiddleware === 'function' 
    ? authMiddleware 
    : authMiddleware.verifyToken;

// استخراج أداة الرفع بأمان
const upload = uploadMiddleware.single 
    ? uploadMiddleware 
    : uploadMiddleware.upload;

// مسار جلب محاضرات مادة معينة
router.get('/subject/:subjectId', materialController.getMaterialsBySubject);

// مسارات رفع محاضرة جديدة (يدعم المسارين لضمان التوافق مع صفحة الرفع لديك)
router.post('/', verifyToken, upload.single('file'), materialController.uploadMaterial);
router.post('/upload', verifyToken, upload.single('file'), materialController.uploadMaterial);

// مسار حذف محاضرة (محمي بالتوكن وللإدارة فقط)
router.delete('/:id', verifyToken, materialController.deleteMaterial);

module.exports = router;