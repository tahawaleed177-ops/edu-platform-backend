const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyToken } = require('../middleware/authMiddleware'); // لحماية الدردشة

router.post('/', verifyToken, chatController.askMireo);

module.exports = router;