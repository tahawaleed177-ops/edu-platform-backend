const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, progressController.getCompletedMaterials);
router.post('/toggle', verifyToken, progressController.toggleProgress);

module.exports = router;