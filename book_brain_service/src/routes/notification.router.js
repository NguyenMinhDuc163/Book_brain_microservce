const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

// Lấy danh sách thông báo của người dùng
router.get('/api/v1/notifications', notificationController.getUserNotifications);

// Thao tác với thông báo (thêm, đánh dấu đọc, xóa)
router.post('/api/v1/notifications', notificationController.handleNotification);

module.exports = router;