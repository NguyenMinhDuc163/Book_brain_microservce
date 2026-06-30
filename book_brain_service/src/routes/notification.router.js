const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { requireAuth } = require('../middleware/authMiddleware');

// Lấy danh sách thông báo của người dùng
router.get('/api/v1/notifications', requireAuth, notificationController.getUserNotifications);

// Thao tác với thông báo (thêm, đánh dấu đọc, xóa)
router.post('/api/v1/notifications', requireAuth, notificationController.handleNotification);

module.exports = router;
