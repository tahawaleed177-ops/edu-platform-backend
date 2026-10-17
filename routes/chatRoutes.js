const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// إزالة الميدل وير لتفادي خطأ 500
router.post('/', chatController.askMireo);

module.exports = router;