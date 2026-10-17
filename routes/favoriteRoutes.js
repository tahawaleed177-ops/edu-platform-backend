const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { verifyToken } = require('../middleware/authMiddleware'); // للتحقق من هوية الطالب

router.get('/', verifyToken, favoriteController.getFavorites);
router.post('/', verifyToken, favoriteController.addFavorite);
router.delete('/:material_id', verifyToken, favoriteController.removeFavorite);

module.exports = router;