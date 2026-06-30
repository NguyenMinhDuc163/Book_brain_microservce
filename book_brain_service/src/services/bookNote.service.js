const db = require('../configs/db.config');

class BookNoteService {
    async createNote(userId, noteData) {
        try {
            const visibleBook = await db.query(
                'SELECT 1 FROM books WHERE book_id = $1 AND is_visible = TRUE',
                [noteData.bookId]
            );
            if (visibleBook.rows.length === 0) {
                throw new Error('Sách không tồn tại.');
            }

            if (noteData.chapterId) {
                const visibleChapter = await db.query(
                    `SELECT 1
                     FROM chapters c
                     JOIN books b ON b.book_id = c.book_id
                     WHERE c.chapter_id = $1 AND c.book_id = $2 AND b.is_visible = TRUE`,
                    [noteData.chapterId, noteData.bookId]
                );
                if (visibleChapter.rows.length === 0) {
                    throw new Error('Chương không tồn tại.');
                }
            }

            const query = `
                INSERT INTO book_notes 
                (user_id, book_id, chapter_id, selected_text, note_content, start_position, end_position)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;
            
            const values = [
                userId,
                noteData.bookId,
                noteData.chapterId,
                noteData.selectedText,
                noteData.noteContent,
                noteData.startPosition,
                noteData.endPosition
            ];

            const result = await db.query(query, values);
            const note = result.rows[0];

            return {
                bookId: note.book_id,
                chapterId: note.chapter_id,
                selectedText: note.selected_text,
                noteContent: note.note_content,
                startPosition: note.start_position,
                endPosition: note.end_position
            };
        } catch (error) {
            throw new Error('Không thể tạo ghi chú: ' + error.message);
        }
    }

    async getNotes(userId, bookId = null, chapterId = null) {
        try {
            let query = `
                SELECT 
                    bn.note_id,
                    bn.book_id,
                    bn.chapter_id,
                    bn.selected_text,
                    bn.note_content,
                    bn.start_position,
                    bn.end_position
                FROM book_notes bn
                JOIN books b ON b.book_id = bn.book_id
                WHERE bn.user_id = $1 AND b.is_visible = TRUE
            `;
            
            const values = [userId];
            let paramIndex = 2;

            if (bookId) {
                query += ` AND bn.book_id = $${paramIndex}`;
                values.push(bookId);
                paramIndex++;
            }
            
            if (chapterId) {
                query += ` AND bn.chapter_id = $${paramIndex}`;
                values.push(chapterId);
            }

            query += ` ORDER BY bn.created_at DESC`;

            const result = await db.query(query, values);

            return result.rows.map(note => ({
                noteId: note.note_id,
                bookId: note.book_id,
                chapterId: note.chapter_id,
                selectedText: note.selected_text,
                noteContent: note.note_content,
                startPosition: note.start_position,
                endPosition: note.end_position
            }));
        } catch (error) {
            throw new Error('Không thể lấy danh sách ghi chú: ' + error.message);
        }
    }

    async deleteNote(userId, noteId) {
        try {
            const query = `
                DELETE FROM book_notes 
                WHERE user_id = $1 AND note_id = $2
                RETURNING *
            `;
            
            const values = [userId, noteId];
            const result = await db.query(query, values);

            if (result.rows.length === 0) {
                throw new Error('Không tìm thấy ghi chú hoặc bạn không có quyền xóa ghi chú này');
            }

            return {
                message: 'Xóa ghi chú thành công'
            };
        } catch (error) {
            throw new Error('Không thể xóa ghi chú: ' + error.message);
        }
    }
}

module.exports = new BookNoteService();
