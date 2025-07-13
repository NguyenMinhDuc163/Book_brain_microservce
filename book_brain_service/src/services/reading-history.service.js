const pool = require('../configs/db.config');
const { logger } = require('../utils/logger');

// Lấy sách theo trạng thái
const getBooksByStatus = async (userId, status = null, page = 1, limit = 10) => {
    try {
        const offset = (page - 1) * limit;

        let query = `

            SELECT

                rh.history_id, rh.book_id, rh.reading_status, rh.start_date, rh.finish_date,

                rh.notes, rh.times_read, rh.completion_rate, rh.current_chapter_id,

                rh.created_at, rh.updated_at,

                b.title, b.url, b.image_url, b.excerpt, b.views, b.status as book_status, b.rating,

                a.author_id, a.name as author_name,

                c.category_id, c.name as category_name,

                (SELECT COUNT(*) FROM chapters WHERE book_id = b.book_id) as total_chapters,

                (SELECT chapter_id FROM user_reading_progress WHERE id = $1 AND book_id = b.book_id) as last_reading_chapter_id,

                (SELECT urp.last_read_at FROM user_reading_progress urp WHERE urp.id = $1 AND urp.book_id = b.book_id) as last_read_at,

                (SELECT chapter_title.title

                 FROM chapters chapter_title

                          JOIN user_reading_progress urp ON chapter_title.chapter_id = urp.chapter_id

                 WHERE urp.id = $1 AND urp.book_id = b.book_id) as last_reading_chapter_title,

                (SELECT current_chapter.title

                 FROM chapters current_chapter

                 WHERE current_chapter.chapter_id = rh.current_chapter_id) as current_chapter_title,

                EXISTS(SELECT 1 FROM user_favorites WHERE id = $1 AND book_id = b.book_id) as is_favorite

            FROM reading_history rh

                     JOIN books b ON rh.book_id = b.book_id

                     LEFT JOIN authors a ON b.author_id = a.author_id

                     LEFT JOIN categories c ON b.category_id = c.category_id

            WHERE rh.user_id = $1

        `;

        const queryParams = [userId];
        let paramIndex = 2;

        // Thêm điều kiện lọc theo trạng thái nếu có
        if (status) {
            query += ` AND rh.reading_status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }

        // Thêm sắp xếp theo trạng thái và thời gian cập nhật
        query += ` ORDER BY 
                  CASE 
                      WHEN rh.reading_status = 'reading' THEN 1
                      WHEN rh.reading_status = 'completed' THEN 2
                      WHEN rh.reading_status = 'plan_to_read' THEN 3
                      ELSE 4
                  END,
                  CASE 
                      WHEN rh.reading_status = 'reading' THEN rh.updated_at 
                      WHEN rh.reading_status = 'completed' THEN rh.finish_date
                      ELSE rh.updated_at
                  END DESC
                  LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);

        // Truy vấn tổng số sách
        let countQuery = `
            SELECT COUNT(*) as total
            FROM reading_history
            WHERE user_id = $1
        `;

        const countParams = [userId];

        if (status) {
            countQuery += ` AND reading_status = $2`;
            countParams.push(status);
        }

        const [booksResult, countResult] = await Promise.all([
            pool.query(query, queryParams),
            pool.query(countQuery, countParams)
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
        logger.error(`Lỗi khi lấy sách theo trạng thái: ${error.message}`);
        throw error;
    }
};

// Cập nhật trạng thái đọc sách
const updateReadingStatus = async (userId, bookId, readingStatus, completionRate = null, notes = null, currentChapterId = null) => {
    const client = await pool.connect();

    try {
        // Bắt đầu transaction
        await client.query('BEGIN');

        // Bỏ qua việc kiểm tra chapter_id có hợp lệ không
        // Chỉ kiểm tra sách có tồn tại không
        const bookCheck = await client.query('SELECT book_id FROM books WHERE book_id = $1', [bookId]);
        if (bookCheck.rows.length === 0) {
            throw new Error('Sách không tồn tại.');
        }

        // Tăng lượt xem của sách
        await client.query(
            'UPDATE books SET views = COALESCE(views, 0) + 1 WHERE book_id = $1',
            [bookId]
        );

        const now = new Date();

        // Xác định start_date và finish_date dựa vào trạng thái
        let startDate = null;
        let finishDate = null;

        if (readingStatus === 'reading' || readingStatus === 'plan_to_read') {
            startDate = now;
        } else if (readingStatus === 'completed') {
            finishDate = now;
            // Nếu trạng thái là completed và không chỉ định tỉ lệ đọc, đặt mặc định là 10
            if (completionRate === null) {
                completionRate = 10;
            }
        }

        // Kiểm tra xem đã có bản ghi lịch sử chưa
        const historyCheck = await client.query(
            'SELECT * FROM reading_history WHERE user_id = $1 AND book_id = $2',
            [userId, bookId]
        );

        let result;

        if (historyCheck.rows.length > 0) {
            // Cập nhật bản ghi hiện có
            const current = historyCheck.rows[0];

            // Nếu đang chuyển từ "completed" sang "completed" lại, tăng times_read
            const incrementTimesRead = (current.reading_status === 'completed' && readingStatus === 'completed');

            const updateQuery = `
                UPDATE reading_history
                SET reading_status = $1,
                    start_date = COALESCE($2, start_date),
                    finish_date = $3,
                    notes = COALESCE($4, notes),
                    completion_rate = COALESCE($5, completion_rate),
                    current_chapter_id = COALESCE($6, current_chapter_id),
                    times_read = CASE WHEN $7 THEN times_read + 1 ELSE times_read END,
                    updated_at = $8
                WHERE user_id = $9 AND book_id = $10
                    RETURNING *
            `;

            result = await client.query(updateQuery, [
                readingStatus,
                startDate,
                finishDate,
                notes,
                completionRate,
                currentChapterId,
                incrementTimesRead,
                now,
                userId,
                bookId
            ]);
        } else {
            // Tạo bản ghi mới
            const insertQuery = `
                INSERT INTO reading_history
                (user_id, book_id, reading_status, start_date, finish_date, notes, completion_rate, current_chapter_id, times_read, created_at, updated_at)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING *
            `;

            result = await client.query(insertQuery, [
                userId,
                bookId,
                readingStatus,
                startDate,
                finishDate,
                notes,
                completionRate,
                currentChapterId,
                readingStatus === 'completed' ? 1 : 0,
                now,
                now
            ]);
        }

        // Nếu completion_rate thay đổi hoặc current_chapter_id thay đổi, cập nhật tương ứng vào user_reading_progress
        if (completionRate !== null || currentChapterId !== null) {
            // Chuyển đổi thang đo 0-10 sang phần trăm (0-100)
            const completionPercentage = completionRate !== null ? completionRate * 10 : null;

            // Kiểm tra xem đã có bản ghi tiến trình đọc chưa
            const progressCheck = await client.query(
                'SELECT * FROM user_reading_progress WHERE id = $1 AND book_id = $2',
                [userId, bookId]
            );

            if (progressCheck.rows.length > 0) {
                // Cập nhật bản ghi hiện có
                let updateProgressQuery = 'UPDATE user_reading_progress SET last_read_at = $1';
                let updateParams = [now];

                // Thêm completion_percentage nếu có
                if (completionPercentage !== null) {
                    updateProgressQuery += ', completion_percentage = $' + (updateParams.length + 1);
                    updateParams.push(completionPercentage);
                }

                // Thêm chapter_id nếu có
                if (currentChapterId !== null) {
                    updateProgressQuery += ', chapter_id = $' + (updateParams.length + 1);
                    updateParams.push(currentChapterId);
                }

                updateProgressQuery += ' WHERE id = $' + (updateParams.length + 1) + ' AND book_id = $' + (updateParams.length + 2);
                updateParams.push(userId, bookId);

                await client.query(updateProgressQuery, updateParams);
            } else {
                // Tạo bản ghi mới
                await client.query(
                    'INSERT INTO user_reading_progress (id, book_id, chapter_id, completion_percentage, last_read_at) VALUES ($1, $2, $3, $4, $5)',
                    [userId, bookId, currentChapterId, completionPercentage || 0, now]
                );
            }
        }

        // Commit transaction
        await client.query('COMMIT');

        return result.rows[0];
    } catch (error) {
        // Rollback transaction nếu có lỗi
        await client.query('ROLLBACK');

        logger.error(`Lỗi khi cập nhật trạng thái đọc sách: ${error.message}`);
        throw error;
    } finally {
        // Luôn giải phóng kết nối client
        client.release();
    }
};

module.exports = {
    getBooksByStatus,
    updateReadingStatus
};