const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');

// Thêm đánh giá mới
router.post('/api/v1/reviews', reviewController.addReview);

// Lấy danh sách đánh giá của sách
router.get('/api/v1/books_reviews', reviewController.getBookReviews);

// Lấy thống kê đánh giá của sách
router.get('/api/v1/reviews/stats', reviewController.getBookReviewStats);

// Xóa đánh giá
router.post('/api/v1/reviews/delete', reviewController.deleteReview);

module.exports = router;