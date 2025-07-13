const { createResponse } = require('../utils/responseHelper');
const { logger } = require('../utils/logger');
const favoriteService = require('../services/favorite.service');

// Lấy danh sách sách yêu thích của người dùng hiện tại
exports.getUserFavorites = async (req, res) => {
    try {
        const userId = req.user.userId;
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const page = req.query.page ? parseInt(req.query.page) : 1;

        const favorites = await favoriteService.getUserFavorites(userId, page, limit);

        if (favorites.books.length > 0) {
            logger.info(`Đã lấy ${favorites.books.length} sách yêu thích của người dùng ID: ${userId}`);
            res.status(200).json(createResponse('success', 'Danh sách sách yêu thích đã được truy xuất thành công.', 200, favorites.books));
        } else {
            logger.info(`Người dùng ID: ${userId} chưa có sách yêu thích nào`);
            res.status(200).json(createResponse('success', 'Bạn chưa có sách yêu thích nào.', 200, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi lấy danh sách sách yêu thích: ${err.message}`, { meta: { error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi lấy danh sách sách yêu thích.', 500, [], err.message));
    }
};

// Thêm/xóa sách vào/khỏi danh sách yêu thích
exports.toggleFavorite = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { book_id, action } = req.body;

        if (!book_id) {
            logger.warn('Thiếu ID sách.');
            return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp ID sách.', 400, []));
        }

        if (!action || (action !== 'add' && action !== 'remove')) {
            logger.warn('Thiếu hoặc sai action.');
            return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp action hợp lệ (add/remove).', 400, []));
        }

        const result = await favoriteService.toggleFavorite(userId, book_id, action);

        if (action === 'add') {
            logger.info(`Đã thêm sách ID: ${book_id} vào danh sách yêu thích của người dùng ID: ${userId}`);
            // Đảm bảo trả về mảng
            res.status(200).json(createResponse('success', 'Đã thêm sách vào danh sách yêu thích.', 200, [result]));
        } else {
            logger.info(`Đã xóa sách ID: ${book_id} khỏi danh sách yêu thích của người dùng ID: ${userId}`);
            // Đảm bảo trả về mảng
            res.status(200).json(createResponse('success', 'Đã xóa sách khỏi danh sách yêu thích.', 200, [result]));
        }
    } catch (err) {
        logger.error(`Lỗi khi cập nhật trạng thái yêu thích: ${err.message}`, { meta: { request: req.body, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi cập nhật trạng thái yêu thích.', 500, [], err.message));
    }
};