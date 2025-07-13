const pool = require('../configs/db.config');
const { logger } = require('../utils/logger');

// Lấy danh sách sách đang theo dõi của người dùng
const getUserSubscriptions = async (userId, page = 1, limit = 10, activeOnly = false) => {
    try {
        const offset = (page - 1) * limit;

        // Truy vấn lấy danh sách sách đang theo dõi kèm thông tin chi tiết
        let query = `
            SELECT b.book_id, b.title, b.url, b.image_url, b.excerpt, b.views, b.status, b.rating,
                   a.author_id, a.name as author_name,
                   c.category_id, c.name as category_name,
                   bs.subscription_id, bs.is_active, bs.subscribed_at, bs.last_notified_at
            FROM book_subscriptions bs
                     JOIN books b ON bs.book_id = b.book_id
                     LEFT JOIN authors a ON b.author_id = a.author_id
                     LEFT JOIN categories c ON b.category_id = c.category_id
            WHERE bs.user_id = $1 and bs.is_active = true
        `;

        const queryParams = [userId];
        let paramCounter = 2;

        // Thêm điều kiện lọc theo trạng thái active nếu yêu cầu
        if (activeOnly) {
            query += ` AND bs.is_active = true`;
        }

        // Thêm sắp xếp và phân trang
        query += ` ORDER BY bs.subscribed_at DESC
                  LIMIT $${paramCounter++} OFFSET $${paramCounter++}`;
        queryParams.push(limit, offset);

        // Truy vấn lấy tổng số sách đang theo dõi
        let countQuery = `
            SELECT COUNT(*) as total
            FROM book_subscriptions
            WHERE user_id = $1
        `;

        if (activeOnly) {
            countQuery += ` AND is_active = true`;
        }

        const [booksResult, countResult] = await Promise.all([
            pool.query(query, queryParams),
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
        logger.error(`Lỗi khi lấy danh sách sách đang theo dõi: ${error.message}`);
        throw error;
    }
};

// Đăng ký/Hủy theo dõi sách
// Đăng ký/Hủy theo dõi sách
const toggleSubscription = async (userId, bookId, action) => {
    try {
        // Kiểm tra xem sách có tồn tại không
        const bookCheckQuery = `SELECT book_id FROM books WHERE book_id = $1`;
        const bookCheckResult = await pool.query(bookCheckQuery, [bookId]);

        if (bookCheckResult.rows.length === 0) {
            throw new Error('Sách không tồn tại.');
        }

        // Kiểm tra xem người dùng đã đăng ký theo dõi sách này chưa
        const checkQuery = `SELECT * FROM book_subscriptions WHERE user_id = $1 AND book_id = $2`;
        const checkResult = await pool.query(checkQuery, [userId, bookId]);
        const isSubscribed = checkResult.rows.length > 0;

        let result = null;

        // Xử lý theo action
        if (action === 'subscribe') {
            if (isSubscribed) {
                // Nếu đã đăng ký và muốn đăng ký lại, cập nhật trạng thái thành active
                const updateQuery = `
                    UPDATE book_subscriptions
                    SET is_active = true, 
                        subscribed_at = CURRENT_TIMESTAMP
                    WHERE user_id = $1 AND book_id = $2
                    RETURNING subscription_id, user_id, book_id, is_active, subscribed_at
                `;
                result = await pool.query(updateQuery, [userId, bookId]);
            } else {
                // Thêm đăng ký mới
                const insertQuery = `
                    INSERT INTO book_subscriptions (user_id, book_id)
                    VALUES ($1, $2)
                    RETURNING subscription_id, user_id, book_id, is_active, subscribed_at
                `;
                result = await pool.query(insertQuery, [userId, bookId]);
            }
        } else if (action === 'unsubscribe') {
            if (!isSubscribed) {
                // Trả về đối tượng với message, không phải mảng
                // Controller sẽ chuyển đổi thành mảng
                return { message: 'Bạn chưa đăng ký theo dõi sách này.' };
            }

            // Cập nhật trạng thái thành không active (thay vì xóa hoàn toàn)
            const deactivateQuery = `
                UPDATE book_subscriptions
                SET is_active = false
                WHERE user_id = $1 AND book_id = $2
                RETURNING subscription_id, user_id, book_id, is_active
            `;
            result = await pool.query(deactivateQuery, [userId, bookId]);
        }

        // Đảm bảo trả về đối tượng từ kết quả
        return result.rows[0];
    } catch (error) {
        logger.error(`Lỗi khi cập nhật trạng thái theo dõi: ${error.message}`);
        throw error;
    }
};
module.exports = {
    getUserSubscriptions,
    toggleSubscription
};