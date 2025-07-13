const pool = require('../configs/db.config');
const { logger } = require('../utils/logger');

// Thêm hoặc cập nhật đánh giá
const addReview = async (data) => {
    const { book_id, user_id, rating, comment } = data;

    try {
        // Kiểm tra xem người dùng đã đánh giá sách này chưa
        const checkQuery = `
            SELECT review_id FROM book_reviews 
            WHERE book_id = $1 AND user_id = $2
        `;
        const checkResult = await pool.query(checkQuery, [book_id, user_id]);

        let result;

        if (checkResult.rows.length > 0) {
            // Cập nhật đánh giá hiện có
            const updateQuery = `
                UPDATE book_reviews
                SET rating = $3, comment = $4, updated_at = CURRENT_TIMESTAMP
                WHERE book_id = $1 AND user_id = $2
                RETURNING review_id, book_id, user_id, rating, comment, created_at, updated_at
            `;
            result = await pool.query(updateQuery, [book_id, user_id, rating, comment]);
        } else {
            // Thêm đánh giá mới
            const insertQuery = `
                INSERT INTO book_reviews (book_id, user_id, rating, comment)
                VALUES ($1, $2, $3, $4)
                RETURNING review_id, book_id, user_id, rating, comment, created_at, updated_at
            `;
            result = await pool.query(insertQuery, [book_id, user_id, rating, comment]);
        }

        return result.rows[0];
    } catch (error) {
        logger.error(`Lỗi khi thêm/cập nhật đánh giá: ${error.message}`);
        throw error;
    }
};

// Lấy danh sách đánh giá của sách
const getBookReviews = async (bookId, page = 1, limit = 10) => {
    try {
        const offset = (page - 1) * limit;

        // Lấy danh sách đánh giá
        const reviewsQuery = `
            SELECT br.review_id, br.book_id, br.user_id, br.rating, br.comment, 
                   br.created_at, br.updated_at, u.username, u.avatar_url,
                   (SELECT COUNT(*) FROM review_votes WHERE review_id = br.review_id AND is_helpful = true) as helpful_count
            FROM book_reviews br
            JOIN users u ON br.user_id = u.id
            WHERE br.book_id = $1
            ORDER BY br.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        // Lấy tổng số đánh giá
        const countQuery = `
            SELECT COUNT(*) as total
            FROM book_reviews
            WHERE book_id = $1
        `;

        const [reviewsResult, countResult] = await Promise.all([
            pool.query(reviewsQuery, [bookId, limit, offset]),
            pool.query(countQuery, [bookId])
        ]);

        const total = parseInt(countResult.rows[0].total);

        return {
            reviews: reviewsResult.rows,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        logger.error(`Lỗi khi lấy danh sách đánh giá: ${error.message}`);
        throw error;
    }
};

// Lấy thống kê đánh giá của sách
const getBookReviewStats = async (bookId) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total_reviews,
                ROUND(AVG(rating)::numeric, 2) as average_rating,
                COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
                COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
                COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
                COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
                COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
            FROM book_reviews
            WHERE book_id = $1
        `;

        const result = await pool.query(query, [bookId]);
        return result.rows[0];
    } catch (error) {
        logger.error(`Lỗi khi lấy thống kê đánh giá: ${error.message}`);
        throw error;
    }
};

// Xóa đánh giá
const deleteReview = async (reviewId, userId) => {
    try {
        const query = `
            DELETE FROM book_reviews
            WHERE review_id = $1 AND user_id = $2
            RETURNING review_id
        `;

        const result = await pool.query(query, [reviewId, userId]);
        return result.rows[0] || null;
    } catch (error) {
        logger.error(`Lỗi khi xóa đánh giá: ${error.message}`);
        throw error;
    }
};

module.exports = {
    addReview,
    getBookReviews,
    getBookReviewStats,
    deleteReview
};