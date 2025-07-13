const express = require('express');
const router = express.Router();
const bookNoteController = require('../controllers/bookNote.controller');

// Các route liên quan đến ghi chú
router.post('/api/v1/book_notes', bookNoteController.createNote);
router.get('/api/v1/book_notes', bookNoteController.getNotes);
router.post('/api/v1/book_notes/delete', bookNoteController.deleteNote);

module.exports = router; 