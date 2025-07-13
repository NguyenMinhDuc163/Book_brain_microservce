const { createResponse } = require('../utils/responseHelper');
const { logger } = require('../utils/logger');
const readingHistoryService = require('../services/reading-history.service');

// Lấy danh sách sách theo trạng thái đọc
exports.getReadingHistory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const status = req.query.status; // completed, reading, plan_to_read, dropped, hoặc không truyền để lấy tất cả
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const page = req.query.page ? parseInt(req.query.page) : 1;

        const books = await readingHistoryService.getBooksByStatus(userId, status, page, limit);

        if (books.books.length > 0) {
            const statusMessage = status ? `${status}` : "tất cả trạng thái";
            logger.info(`Đã lấy ${books.books.length} sách ${statusMessage} của người dùng ID: ${userId}`);
            res.status(200).json(createResponse('success', `Danh sách sách đã được truy xuất thành công.`, 200, books.books));
        } else {
            logger.info(`Người dùng ID: ${userId} không có sách nào ${status ? `ở trạng thái ${status}` : ""}`);
            res.status(200).json(createResponse('success', `Bạn không có sách nào ${status ? `ở trạng thái ${status}` : ""}.`, 200, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi lấy lịch sử đọc sách: ${err.message}`, { meta: { error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi lấy lịch sử đọc sách.', 500, [], err.message));
    }
};

// Cập nhật trạng thái đọc sách
exports.updateReadingStatus = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { book_id, reading_status, completion_rate, notes, current_chapter_id } = req.body;

        if (!book_id || !reading_status) {
            logger.warn('Thiếu thông tin cần thiết.');
            return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp ID sách và trạng thái đọc.', 400, []));
        }

        // Kiểm tra trạng thái đọc hợp lệ
        const validStatuses = ['completed', 'reading', 'plan_to_read', 'dropped'];
        if (!validStatuses.includes(reading_status)) {
            logger.warn(`Trạng thái đọc không hợp lệ: ${reading_status}`);
            return res.status(200).json(createResponse('fail', 'Trạng thái đọc không hợp lệ.', 400, []));
        }

        // Kiểm tra tỉ lệ đọc sách (nếu có)
        let completionRateValue = null;
        if (completion_rate !== undefined) {
            completionRateValue = parseFloat(completion_rate);
            if (isNaN(completionRateValue) || completionRateValue < 0 || completionRateValue > 10) {
                logger.warn(`Tỉ lệ đọc sách không hợp lệ: ${completion_rate}`);
                return res.status(200).json(createResponse('fail', 'Tỉ lệ đọc sách phải từ 0 đến 10.', 400, []));
            }
        }

        // Kiểm tra current_chapter_id nếu được cung cấp - chỉ kiểm tra nó là số hợp lệ
        let currentChapterId = null;
        if (current_chapter_id !== undefined && current_chapter_id !== null) {
            currentChapterId = parseInt(current_chapter_id);
            if (isNaN(currentChapterId)) {
                logger.warn(`ID chương không hợp lệ (không phải số): ${current_chapter_id}`);
                return res.status(200).json(createResponse('fail', 'ID chương phải là số hợp lệ.', 400, []));
            }
        }

        const result = await readingHistoryService.updateReadingStatus(userId, book_id, reading_status, completionRateValue, notes, currentChapterId);

        logger.info(`Đã cập nhật trạng thái đọc sách ID: ${book_id} thành "${reading_status}" cho người dùng ID: ${userId}`);
        res.status(200).json(createResponse('success', 'Đã cập nhật trạng thái đọc sách thành công.', 200, [result]));
    } catch (err) {
        logger.error(`Lỗi khi cập nhật trạng thái đọc sách: ${err.message}`, { meta: { request: req.body, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi cập nhật trạng thái đọc sách.', 500, [], err.message));
    }
};