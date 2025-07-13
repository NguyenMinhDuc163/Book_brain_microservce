const pool = require('../configs/db.config');
const { logger } = require('../utils/logger');

// Lấy danh sách sách yêu thích của người dùng
const getUserFavorites = async (userId, page = 1, limit = 10) => {
    try {
        const offset = (page - 1) * limit;

        // Truy vấn lấy danh sách sách yêu thích kèm thông tin chi tiết
        const query = `
            SELECT b.book_id, b.title, b.url, b.image_url, b.excerpt, b.views, b.status, b.rating,
                   a.author_id, a.name as author_name,
                   c.category_id, c.name as category_name,
                   uf.added_at
            FROM user_favorites uf
                     JOIN books b ON uf.book_id = b.book_id
                     LEFT JOIN authors a ON b.author_id = a.author_id
                     LEFT JOIN categories c ON b.category_id = c.category_id
            WHERE uf.id = $1
            ORDER BY uf.added_at DESC
                LIMIT $2 OFFSET $3
        `;

        // Truy vấn lấy tổng số sách yêu thích
        const countQuery = `
            SELECT COUNT(*) as total
            FROM user_favorites
            WHERE id = $1
        `;

        const [booksResult, countResult] = await Promise.all([
            pool.query(query, [userId, limit, offset]),
            pool.query(countQuery, [userId])
        ]);

        const total = parseInt(countResult.rows[0].total);

        return {
            books: booksResult.rows,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        logger.error(`Lỗi khi lấy danh sách sách yêu thích: ${error.message}`);
        throw error;
    }
};

// Thêm/xóa sách vào/khỏi danh sách yêu thích
const toggleFavorite = async (userId, bookId, action) => {
    try {
        // Kiểm tra xem sách có tồn tại không
        const bookCheckQuery = `SELECT book_id FROM books WHERE book_id = $1`;
        const bookCheckResult = await pool.query(bookCheckQuery, [bookId]);

        if (bookCheckResult.rows.length === 0) {
            throw new Error('Sách không tồn tại.');
        }

        // Kiểm tra xem sách đã nằm trong danh sách yêu thích chưa
        const checkQuery = `SELECT * FROM user_favorites WHERE id = $1 AND book_id = $2`;
        const checkResult = await pool.query(checkQuery, [userId, bookId]);
        const isInFavorites = checkResult.rows.length > 0;

        let result = null;

        if (action === 'add') {
            // Nếu đã có trong danh sách yêu thích và muốn thêm -> không làm gì
            if (isInFavorites) {
                return { message: 'Sách đã có trong danh sách yêu thích.' };
            }

            // Thêm vào danh sách yêu thích
            const addQuery = `
                INSERT INTO user_favorites (id, book_id)
                VALUES ($1, $2)
                    RETURNING id, book_id, added_at
            `;
            result = await pool.query(addQuery, [userId, bookId]);
            return result.rows[0];
        } else if (action === 'remove') {
            // Nếu không có trong danh sách yêu thích và muốn xóa -> không làm gì
            if (!isInFavorites) {
                return { message: 'Sách không có trong danh sách yêu thích.' };
            }

            // Xóa khỏi danh sách yêu thích
            const removeQuery = `
                DELETE FROM user_favorites
                WHERE id = $1 AND book_id = $2
                    RETURNING id, book_id
            `;
            result = await pool.query(removeQuery, [userId, bookId]);
            return result.rows[0];
        }
    } catch (error) {
        logger.error(`Lỗi khi cập nhật trạng thái yêu thích: ${error.message}`);
        throw error;
    }
};

module.exports = {
    getUserFavorites,
    toggleFavorite
};