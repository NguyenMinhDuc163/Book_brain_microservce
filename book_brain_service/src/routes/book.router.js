const express = require('express');
const router = express.Router();
const bookController = require('../controllers/book.controller');
const { optionalAuth } = require('../middleware/authMiddleware');
const { publicRateLimit } = require('../middleware/publicRateLimit');

// Các route liên quan đến sách
router.get('/api/v1/books', optionalAuth, publicRateLimit, bookController.getBooks);
router.get('/api/v1/books/search', optionalAuth, publicRateLimit, bookController.searchBooks);
router.get('/api/v1/books/trending', optionalAuth, publicRateLimit, bookController.getTrendingBooks);
router.get('/api/v1/books/chapters', optionalAuth, publicRateLimit, bookController.getChaptersByBookId);
router.get('/api/v1/detailBook', optionalAuth, publicRateLimit, bookController.getBookDetail);
module.exports = router;
