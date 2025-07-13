const { createResponse } = require('../utils/responseHelper');
const { logger } = require('../utils/logger');
const notificationService = require('../services/notification.service');

// Lấy danh sách thông báo của người dùng hiện tại
exports.getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const unreadOnly = req.query.unread_only === 'true';

        const notifications = await notificationService.getUserNotifications(userId, page, limit, unreadOnly);

        if (notifications.items.length > 0) {
            logger.info(`Đã lấy ${notifications.items.length} thông báo của người dùng ID: ${userId}`);
            res.status(200).json(createResponse('success', 'Danh sách thông báo đã được truy xuất thành công.', 200, notifications.items));
        } else {
            logger.info(`Người dùng ID: ${userId} không có thông báo nào`);
            res.status(200).json(createResponse('success', 'Bạn không có thông báo nào.', 200, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi lấy danh sách thông báo: ${err.message}`, { meta: { error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi lấy danh sách thông báo.', 500, [], err.message));
    }
};

// Xử lý các thao tác với thông báo (thêm, đánh dấu đọc, xóa)
exports.handleNotification = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { action, notification_id, book_id, chapter_id, title, message } = req.body;

        if (!action) {
            logger.warn('Thiếu tham số action.');
            return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp tham số action.', 400, []));
        }

        let result;

        switch (action) {
            case 'add':
                // Thêm thông báo mới
                if (!book_id || !title || !message) {
                    logger.warn('Thiếu thông tin thông báo.');
                    return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp đầy đủ thông tin thông báo.', 400, []));
                }
                result = await notificationService.addNotification(userId, book_id, chapter_id, title, message);
                logger.info(`Đã thêm thông báo mới cho người dùng ID: ${userId}`);
                return res.status(200).json(createResponse('success', 'Đã thêm thông báo thành công.', 200, [result]));

            case 'mark_read':
                // Đánh dấu thông báo đã đọc
                if (!notification_id) {
                    logger.warn('Thiếu ID thông báo.');
                    return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp ID thông báo.', 400, []));
                }
                result = await notificationService.markAsRead(userId, notification_id);
                if (result) {
                    logger.info(`Đã đánh dấu thông báo ID: ${notification_id} là đã đọc cho người dùng ID: ${userId}`);
                    return res.status(200).json(createResponse('success', 'Đã đánh dấu thông báo là đã đọc.', 200, [result]));
                } else {
                    logger.warn(`Không tìm thấy thông báo ID: ${notification_id} cho người dùng ID: ${userId}`);
                    return res.status(200).json(createResponse('fail', 'Không tìm thấy thông báo.', 404, []));
                }

            case 'mark_all_read':
                // Đánh dấu tất cả thông báo đã đọc
                const count1 = await notificationService.markAllAsRead(userId);
                logger.info(`Đã đánh dấu ${count1} thông báo là đã đọc cho người dùng ID: ${userId}`);
                return res.status(200).json(createResponse('success', `Đã đánh dấu ${count1} thông báo là đã đọc.`, 200, [{count: count1}]));

            case 'delete':
                // Xóa một thông báo
                if (!notification_id) {
                    logger.warn('Thiếu ID thông báo.');
                    return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp ID thông báo.', 400, []));
                }
                result = await notificationService.deleteNotification(userId, notification_id);
                if (result) {
                    logger.info(`Đã xóa thông báo ID: ${notification_id} của người dùng ID: ${userId}`);
                    return res.status(200).json(createResponse('success', 'Đã xóa thông báo thành công.', 200, [result]));
                } else {
                    logger.warn(`Không tìm thấy thông báo ID: ${notification_id} cho người dùng ID: ${userId}`);
                    return res.status(200).json(createResponse('fail', 'Không tìm thấy thông báo.', 404, []));
                }

            case 'delete_all':
                // Xóa tất cả thông báo
                const count2 = await notificationService.deleteAllNotifications(userId);
                logger.info(`Đã xóa ${count2} thông báo của người dùng ID: ${userId}`);
                return res.status(200).json(createResponse('success', `Đã xóa ${count2} thông báo.`, 200, [{count: count2}]));

            default:
                logger.warn(`Action không hợp lệ: ${action}`);
                return res.status(200).json(createResponse('fail', 'Action không hợp lệ.', 400, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi xử lý thông báo: ${err.message}`, { meta: { request: req.body, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi xử lý thông báo.', 500, [], err.message));
    }
};