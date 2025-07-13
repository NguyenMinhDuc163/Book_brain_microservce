const express = require('express');
const { Pool } = require('pg');
const app = express();

// Cấu hình kết nối PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: '20.2.26.123',
    database: 'book_brain_db', // Thay đổi tên database của bạn tại đây
    password: 'NguyenDuc@163', // Thay đổi mật khẩu của bạn tại đây
    port: 5432,
});

// Hàm tìm sách không có chapters
async function findBooksWithoutChapters() {
    const client = await pool.connect();
    try {
        // Tìm tất cả các sách không có chapters
        const query = `
      SELECT b.book_id, b.title 
      FROM books b
      LEFT JOIN chapters c ON b.book_id = c.book_id
      WHERE c.chapter_id IS NULL
    `;

        const result = await client.query(query);
        return result.rows;
    } catch (error) {
        console.error('Lỗi khi tìm sách không có chapters:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Hàm xóa một sách
async function deleteBook(bookId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Xóa các bản ghi liên quan trong các bảng khác
        await client.query('DELETE FROM user_reading_progress WHERE book_id = $1', [bookId]);
        await client.query('DELETE FROM bookmarks WHERE book_id = $1', [bookId]);
        await client.query('DELETE FROM user_favorites WHERE book_id = $1', [bookId]);

        // Xóa sách
        const result = await client.query('DELETE FROM books WHERE book_id = $1 RETURNING title', [bookId]);

        await client.query('COMMIT');
        return result.rows[0]?.title;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Lỗi khi xóa sách có ID ${bookId}:`, error);
        throw error;
    } finally {
        client.release();
    }
}

// API endpoint để liệt kê các sách không có chapters
app.get('/api/books/without-chapters', async (req, res) => {
    try {
        const books = await findBooksWithoutChapters();
        res.json({
            success: true,
            count: books.length,
            books
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi tìm sách',
            error: error.message
        });
    }
});

// API endpoint để xóa sách không có chapters
app.delete('/api/books/cleanup', async (req, res) => {
    try {
        const books = await findBooksWithoutChapters();

        if (books.length === 0) {
            return res.json({
                success: true,
                message: 'Không có sách nào cần xóa',
                deleted: 0
            });
        }

        const deletedBooks = [];

        for (const book of books) {
            const title = await deleteBook(book.book_id);
            deletedBooks.push({
                book_id: book.book_id,
                title: title || book.title
            });
        }

        res.json({
            success: true,
            message: `Đã xóa ${deletedBooks.length} sách không có chapters`,
            deleted: deletedBooks.length,
            books: deletedBooks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi xóa sách',
            error: error.message
        });
    }
});

// Thực thi chương trình như một script độc lập
async function runCleanup() {
    try {
        console.log('Đang tìm sách không có chapters...');
        const books = await findBooksWithoutChapters();

        console.log(`Tìm thấy ${books.length} sách không có chapters:`);
        books.forEach(book => {
            console.log(`- ID: ${book.book_id}, Tiêu đề: ${book.title}`);
        });

        if (books.length === 0) {
            console.log('Không có sách nào cần xóa.');
            process.exit(0);
        }

        console.log('\nBắt đầu xóa sách...');
        let deletedCount = 0;

        for (const book of books) {
            try {
                const title = await deleteBook(book.book_id);
                console.log(`✓ Đã xóa sách: ${title || book.title} (ID: ${book.book_id})`);
                deletedCount++;
            } catch (error) {
                console.error(`✗ Không thể xóa sách ID ${book.book_id}: ${error.message}`);
            }
        }

        console.log(`\nĐã hoàn thành. Đã xóa ${deletedCount}/${books.length} sách.`);
    } catch (error) {
        console.error('Lỗi trong quá trình xóa:', error);
    } finally {
        // Đóng kết nối pool
        await pool.end();
        process.exit(0);
    }
}

// Kiểm tra nếu script được chạy trực tiếp (không phải import)
if (require.main === module) {
    // Chạy script
    runCleanup();
} else {
    // Khởi động server nếu script được import
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server đang chạy trên cổng ${PORT}`);
    });
}

module.exports = { findBooksWithoutChapters, deleteBook };