const pool = require('../configs/db.config');
const { logger } = require('../utils/logger');

// Lấy danh sách thông báo của người dùng
const getUserNotifications = async (userId, page = 1, limit = 10, unreadOnly = false) => {
    try {
        const offset = (page - 1) * limit;

        // Xây dựng câu truy vấn
        let query = `
            SELECT n.notification_id, n.book_id, n.chapter_id, n.title, n.message, n.is_read, n.created_at,
                   b.title as book_title, b.url as book_url, b.image_url as book_image_url,
                   c.title as chapter_title, c.url as chapter_url
            FROM notifications n
            LEFT JOIN books b ON n.book_id = b.book_id
            LEFT JOIN chapters c ON n.chapter_id = c.chapter_id
            WHERE n.user_id = $1
              AND (n.book_id IS NULL OR b.is_visible = TRUE)
        `;

        const params = [userId];
        let paramCount = 2;

        // Thêm điều kiện nếu chỉ muốn xem thông báo chưa đọc
        if (unreadOnly) {
            query += ` AND n.is_read = FALSE`;
        }

        // Thêm sắp xếp và phân trang
        query += ` ORDER BY n.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
        params.push(limit, offset);

        // Truy vấn tổng số thông báo
        let countQuery = `
            SELECT COUNT(*) as total
            FROM notifications n
            LEFT JOIN books b ON b.book_id = n.book_id
            WHERE n.user_id = $1
              AND (n.book_id IS NULL OR b.is_visible = TRUE)
        `;

        if (unreadOnly) {
            countQuery += ` AND n.is_read = FALSE`;
        }

        // Thực hiện truy vấn
        const [notificationsResult, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, [userId])
        ]);

        const total = parseInt(countResult.rows[0].total);

        return {
            items: notificationsResult.rows,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        logger.error(`Lỗi khi lấy danh sách thông báo: ${error.message}`);
        throw error;
    }
};

// Đánh dấu thông báo đã đọc
const markAsRead = async (userId, notificationId) => {
    try {
        const query = `
            UPDATE notifications
            SET is_read = TRUE
            WHERE notification_id = $1 AND user_id = $2
              AND (
                book_id IS NULL OR EXISTS (
                    SELECT 1 FROM books b
                    WHERE b.book_id = notifications.book_id AND b.is_visible = TRUE
                )
              )
            RETURNING notification_id, book_id, chapter_id, title, message, is_read, created_at
        `;

        const result = await pool.query(query, [notificationId, userId]);
        return result.rows[0] || null;
    } catch (error) {
        logger.error(`Lỗi khi đánh dấu thông báo đã đọc: ${error.message}`);
        throw error;
    }
};

// Đánh dấu tất cả thông báo đã đọc
const markAllAsRead = async (userId) => {
    try {
        const query = `
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = $1 AND is_read = FALSE
            RETURNING notification_id
        `;

        const result = await pool.query(query, [userId]);
        return result.rowCount;
    } catch (error) {
        logger.error(`Lỗi khi đánh dấu tất cả thông báo đã đọc: ${error.message}`);
        throw error;
    }
};

// Xóa một thông báo
const deleteNotification = async (userId, notificationId) => {
    try {
        const query = `
            DELETE FROM notifications
            WHERE notification_id = $1 AND user_id = $2
            RETURNING notification_id
        `;

        const result = await pool.query(query, [notificationId, userId]);
        return result.rows[0] || null;
    } catch (error) {
        logger.error(`Lỗi khi xóa thông báo: ${error.message}`);
        throw error;
    }
};

// Xóa tất cả thông báo
const deleteAllNotifications = async (userId) => {
    try {
        const query = `
            DELETE FROM notifications
            WHERE user_id = $1
            RETURNING notification_id
        `;

        const result = await pool.query(query, [userId]);
        return result.rowCount;
    } catch (error) {
        logger.error(`Lỗi khi xóa tất cả thông báo: ${error.message}`);
        throw error;
    }
};

// Thêm thông báo mới
const addNotification = async (userId, bookId, chapterId, title, message) => {
    try {
        const visibleBook = await pool.query(
            'SELECT 1 FROM books WHERE book_id = $1 AND is_visible = TRUE',
            [bookId]
        );
        if (visibleBook.rows.length === 0) throw new Error('Sách không tồn tại.');

        if (chapterId) {
            const visibleChapter = await pool.query(
                `SELECT 1
                 FROM chapters c
                 JOIN books b ON b.book_id = c.book_id
                 WHERE c.chapter_id = $1 AND c.book_id = $2 AND b.is_visible = TRUE`,
                [chapterId, bookId]
            );
            if (visibleChapter.rows.length === 0) throw new Error('Chương không tồn tại.');
        }

        const query = `
            INSERT INTO notifications (user_id, book_id, chapter_id, title, message)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING notification_id, book_id, chapter_id, title, message, is_read, created_at
        `;

        const result = await pool.query(query, [userId, bookId, chapterId, title, message]);
        return result.rows[0];
    } catch (error) {
        logger.error(`Lỗi khi thêm thông báo: ${error.message}`);
        throw error;
    }
};

module.exports = {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    addNotification
};
