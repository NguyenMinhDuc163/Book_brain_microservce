const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { optionalAuth, requireAuth } = require('../middleware/authMiddleware');
const { publicRateLimit } = require('../middleware/publicRateLimit');

// Thêm đánh giá mới
router.post('/api/v1/reviews', requireAuth, reviewController.addReview);

// Lấy danh sách đánh giá của sách
router.get('/api/v1/books_reviews', optionalAuth, publicRateLimit, reviewController.getBookReviews);

// Lấy thống kê đánh giá của sách
router.get('/api/v1/reviews/stats', optionalAuth, publicRateLimit, reviewController.getBookReviewStats);

// Xóa đánh giá
router.post('/api/v1/reviews/delete', requireAuth, reviewController.deleteReview);

module.exports = router;
