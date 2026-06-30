const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { requireAuth } = require('../middleware/authMiddleware');

// Lấy danh sách sách đang theo dõi của người dùng
router.get('/api/v1/subscriptions', requireAuth, subscriptionController.getUserSubscriptions);

// Đăng ký/Hủy theo dõi sách
router.post('/api/v1/subscriptions', requireAuth, subscriptionController.toggleSubscription);

module.exports = router;
