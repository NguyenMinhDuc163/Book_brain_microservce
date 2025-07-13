const bookNoteService = require('../services/bookNote.service');

class BookNoteController {
    async createNote(req, res) {
        try {
            const userId = req.user.userId;
            const noteData = req.body;

            const note = await bookNoteService.createNote(userId, noteData);

            res.status(200).json({
                code: 201,
                data: [note],
                status: 'success',
                message: 'Tạo ghi chú thành công',
                error: ''
            });
        } catch (error) {
            res.status(200).json({
                code: 500,
                data: [],
                status: 'error',
                message: error.message,
                error: error.message
            });
        }
    }

    async getNotes(req, res) {
        try {
            const userId = req.user.userId;
            const { bookId, chapterId } = req.query;

            const notes = await bookNoteService.getNotes(userId, bookId, chapterId);

            res.status(200).json({
                code: 200,
                data: notes,
                status: 'success',
                message: '',
                error: ''
            });
        } catch (error) {
            res.status(200).json({
                code: 500,
                data: [],
                status: 'error',
                message: error.message,
                error: error.message
            });
        }
    }

    async deleteNote(req, res) {
        try {
            const userId = req.user.userId;
            const { noteId } = req.body;

            if (!noteId) {
                return res.status(200).json({
                    code: 400,
                    data: [],
                    status: 'error',
                    message: 'Vui lòng cung cấp ID của ghi chú cần xóa',
                    error: 'Missing noteId'
                });
            }

            const result = await bookNoteService.deleteNote(userId, noteId);

            res.status(200).json({
                code: 200,
                data: [result],
                status: 'success',
                message: 'Xóa ghi chú thành công',
                error: ''
            });
        } catch (error) {
            res.status(200).json({
                code: 500,
                data: [],
                status: 'error',
                message: error.message,
                error: error.message
            });
        }
    }
}

module.exports = new BookNoteController(); 