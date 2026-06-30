const express = require('express');
const router = express.Router();
const readingHistoryController = require('../controllers/reading-history.controller');
const { requireAuth } = require('../middleware/authMiddleware');

// Lấy lịch sử đọc sách (có thể lọc theo trạng thái)
router.get('/api/v1/reading_history', requireAuth, readingHistoryController.getReadingHistory);

// Cập nhật trạng thái đọc sách
router.post('/api/v1/reading_history', requireAuth, readingHistoryController.updateReadingStatus);

module.exports = router;
