const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');

// التعديل هنا: استدعاء ملف الحراس بشكل عام
const authMiddleware = require('../middleware/authMiddleware'); 

// التعديل هنا: تحديد الدالة authMiddleware.verifyToken بدقة
router.post('/', authMiddleware.verifyToken, subjectController.createSubject);
router.get('/', authMiddleware.verifyToken, subjectController.getAllSubjects);

module.exports = router;