const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { verifyToken } = require('../middleware/authMiddleware'); // للتحقق من هوية المدير

router.get('/', scheduleController.getSchedule);
router.post('/', verifyToken, scheduleController.addScheduleItem);
router.delete('/:id', verifyToken, scheduleController.deleteScheduleItem);

module.exports = router;