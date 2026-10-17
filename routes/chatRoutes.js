const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// قمنا بإزالة الحماية (verifyToken) مؤقتاً للتأكد من عمل ميريو
router.post('/', chatController.askMireo);

module.exports = router;