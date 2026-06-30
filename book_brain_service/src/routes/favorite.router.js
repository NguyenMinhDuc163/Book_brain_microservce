const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favorite.controller');
const { requireAuth } = require('../middleware/authMiddleware');

// Lấy danh sách sách yêu thích của người dùng
router.get('/api/v1/favorites', requireAuth, favoriteController.getUserFavorites);

// Thêm/xóa sách vào/khỏi yêu thích
router.post('/api/v1/favorites', requireAuth, favoriteController.toggleFavorite);

module.exports = router;
