const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/api/v1/categories', requireAuth, categoryController.getCategories);

module.exports = router;
