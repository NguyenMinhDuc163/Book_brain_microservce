// src/routes/ranking.router.js
const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/ranking.controller');
const { optionalAuth } = require('../middleware/authMiddleware');
const { publicRateLimit } = require('../middleware/publicRateLimit');

// Lấy bảng xếp hạng sách
router.get('/api/v1/rankings/books', optionalAuth, publicRateLimit, rankingController.getBookRankings);

// Lấy danh sách tác giả xếp hạng cao
router.get('/api/v1/rankings/authors', optionalAuth, publicRateLimit, rankingController.getAuthorRankings)

module.exports = router;
