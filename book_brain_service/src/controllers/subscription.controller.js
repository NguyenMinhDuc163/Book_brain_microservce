const { createResponse } = require('../utils/responseHelper');
const { logger } = require('../utils/logger');
const subscriptionService = require('../services/subscription.service');

// Lấy danh sách sách đang theo dõi của người dùng hiện tại
exports.getUserSubscriptions = async (req, res) => {
    try {
        const userId = req.user.userId;
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const activeOnly = req.query.active_only === 'true';

        const subscriptions = await subscriptionService.getUserSubscriptions(userId, page, limit, activeOnly);

        if (subscriptions.books.length > 0) {
            logger.info(`Đã lấy ${subscriptions.books.length} sách đang theo dõi của người dùng ID: ${userId}`);
            res.status(200).json(createResponse('success', 'Danh sách sách đang theo dõi đã được truy xuất thành công.', 200, subscriptions.books));
        } else {
            logger.info(`Người dùng ID: ${userId} chưa theo dõi sách nào`);
            res.status(200).json(createResponse('success', 'Bạn chưa theo dõi sách nào.', 200, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi lấy danh sách sách đang theo dõi: ${err.message}`, { meta: { error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi lấy danh sách sách đang theo dõi.', 500, [], err.message));
    }
};

// Đăng ký/Hủy theo dõi sách
exports.toggleSubscription = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { book_id, action } = req.body;

        if (!book_id) {
            logger.warn('Thiếu ID sách.');
            return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp ID sách.', 400, []));
        }

        if (!action || (action !== 'subscribe' && action !== 'unsubscribe')) {
            logger.warn('Thiếu hoặc sai action.');
            return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp action hợp lệ (subscribe/unsubscribe).', 400, []));
        }

        const result = await subscriptionService.toggleSubscription(userId, book_id, action);

        if (action === 'subscribe') {
            logger.info(`Đã đăng ký theo dõi sách ID: ${book_id} cho người dùng ID: ${userId}`);
            // Đảm bảo luôn trả về mảng
            res.status(200).json(createResponse('success', 'Đã đăng ký theo dõi sách thành công.', 200, [result]));
        } else {
            logger.info(`Đã hủy theo dõi sách ID: ${book_id} cho người dùng ID: ${userId}`);
            // Đảm bảo luôn trả về mảng
            res.status(200).json(createResponse('success', 'Đã hủy theo dõi sách thành công.', 200, [result]));
        }
    } catch (err) {
        logger.error(`Lỗi khi cập nhật trạng thái theo dõi: ${err.message}`, { meta: { request: req.body, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi cập nhật trạng thái theo dõi.', 500, [], err.message));
    }
};