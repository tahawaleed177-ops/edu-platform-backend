const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const authMiddleware = require('../middleware/authMiddleware');

// استخراج دالة التحقق من التوكن
const verifyToken = typeof authMiddleware === 'function' 
    ? authMiddleware 
    : authMiddleware.verifyToken;

// مسارات التبليغات
router.get('/', announcementController.getAllAnnouncements); // متاح للجميع
router.post('/', verifyToken, announcementController.createAnnouncement); // للمدير فقط
router.delete('/:id', verifyToken, announcementController.deleteAnnouncement); // للمدير فقط

module.exports = router;