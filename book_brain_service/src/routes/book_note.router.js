const express = require('express');
const router = express.Router();
const bookNoteController = require('../controllers/bookNote.controller');
const { requireAuth } = require('../middleware/authMiddleware');

// Các route liên quan đến ghi chú
router.post('/api/v1/book_notes', requireAuth, bookNoteController.createNote);
router.get('/api/v1/book_notes', requireAuth, bookNoteController.getNotes);
router.post('/api/v1/book_notes/delete', requireAuth, bookNoteController.deleteNote);

module.exports = router;
