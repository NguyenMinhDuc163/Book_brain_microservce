const { createResponse } = require('../utils/responseHelper');
const { logger } = require('../utils/logger');
const reviewService = require('../services/review.service');

// Thêm đánh giá mới
exports.addReview = async (req, res) => {
    try {
        const { book_id, rating, comment } = req.body;
        const user_id = req.user.userId;

        if (!book_id || !rating) {
            logger.warn('Thiếu thông tin đánh giá.');
            return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp ID sách và đánh giá.', 400, []));
        }

        if (rating < 1 || rating > 5) {
            logger.warn('Đánh giá không hợp lệ.');
            return res.status(200).json(createResponse('fail', 'Đánh giá phải có giá trị từ 1 đến 5.', 400, []));
        }

        const reviewData = {
            book_id,
            user_id,
            rating,
            comment
        };

        const review = await reviewService.addReview(reviewData);

        logger.info(`Đã thêm/cập nhật đánh giá cho sách ID: ${book_id} từ người dùng ID: ${user_id}`);
        res.status(200).json(createResponse('success', 'Đánh giá đã được ghi nhận.', 200, [review]));
    } catch (err) {
        logger.error(`Lỗi khi thêm đánh giá: ${err.message}`, { meta: { request: req.body, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi thêm đánh giá.', 500, [], err.message));
    }
};

// Lấy danh sách đánh giá của sách
exports.getBookReviews = async (req, res) => {
    try {
        // Lấy bookId từ query param
        const bookId = req.query.book_id;
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;

        if (!bookId) {
            logger.warn('Thiếu ID sách.');
            return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp ID sách.', 400, []));
        }

        const result = await reviewService.getBookReviews(bookId, page, limit);

        if (result.reviews.length > 0) {
            logger.info(`Đã lấy ${result.reviews.length} đánh giá của sách ID: ${bookId}`);
            res.status(200).json(createResponse('success', 'Danh sách đánh giá đã được truy xuất thành công.', 200, result.reviews));
        } else {
            logger.warn(`Không tìm thấy đánh giá nào cho sách với ID: ${bookId}`);
            res.status(200).json(createResponse('fail', 'Không tìm thấy đánh giá nào cho sách này.', 404, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi lấy danh sách đánh giá: ${err.message}`, { meta: { request: req.query, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi lấy danh sách đánh giá.', 500, [], err.message));
    }
};

// Lấy thống kê đánh giá của sách
exports.getBookReviewStats = async (req, res) => {
    try {
        const bookId = req.query.bookId; // Sử dụng query param

        if (!bookId) {
            logger.warn('Thiếu ID sách.');
            return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp ID sách.', 400, []));
        }

        const stats = await reviewService.getBookReviewStats(bookId);

        logger.info(`Đã lấy thống kê đánh giá của sách ID: ${bookId}`);
        res.status(200).json(createResponse('success', 'Thống kê đánh giá đã được truy xuất thành công.', 200, [stats]));
    } catch (err) {
        logger.error(`Lỗi khi lấy thống kê đánh giá: ${err.message}`, { meta: { request: req.query, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi lấy thống kê đánh giá.', 500, [], err.message));
    }
};
// Lấy đánh giá của người dùng
exports.getUserReview = async (req, res) => {
    try {
        const bookId = req.query.book_id; // Chuyển sang dùng query param
        const userId = req.user.userId;

        if (!bookId) {
            logger.warn('Thiếu ID sách.');
            return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp ID sách.', 400, []));
        }

        const review = await reviewService.getUserReview(bookId, userId);

        if (review) {
            logger.info(`Đã lấy đánh giá của người dùng ID: ${userId} cho sách ID: ${bookId}`);
            res.status(200).json(createResponse('success', 'Đánh giá của bạn đã được truy xuất thành công.', 200, [review]));
        } else {
            logger.info(`Người dùng ID: ${userId} chưa đánh giá sách ID: ${bookId}`);
            res.status(200).json(createResponse('success', 'Bạn chưa đánh giá sách này.', 200, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi lấy đánh giá của người dùng: ${err.message}`, { meta: { request: req.query, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi lấy đánh giá của người dùng.', 500, [], err.message));
    }
};

// Xóa đánh giá
exports.deleteReview = async (req, res) => {
    try {
        // Lấy reviewId từ body thay vì query param
        const { review_id } = req.body;
        const userId = req.user.userId;

        if (!review_id) {
            logger.warn('Thiếu ID đánh giá.');
            return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp ID đánh giá.', 400, []));
        }

        const result = await reviewService.deleteReview(review_id, userId);

        if (result) {
            logger.info(`Đã xóa đánh giá ID: ${review_id} của người dùng ID: ${userId}`);
            res.status(200).json(createResponse('success', 'Đánh giá đã được xóa thành công.', 200, []));
        } else {
            logger.warn(`Không tìm thấy đánh giá ID: ${review_id} của người dùng ID: ${userId}`);
            res.status(200).json(createResponse('fail', 'Không tìm thấy đánh giá này hoặc bạn không có quyền xóa.', 404, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi xóa đánh giá: ${err.message}`, { meta: { request: req.body, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi xóa đánh giá.', 500, [], err.message));
    }
};exports.deleteReview = async (req, res) => {
    try {
        // Lấy reviewId từ body thay vì query param
        const { review_id } = req.body;
        const userId = req.user.userId;

        if (!review_id) {
            logger.warn('Thiếu ID đánh giá.');
            return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp ID đánh giá.', 400, []));
        }

        const result = await reviewService.deleteReview(review_id, userId);

        if (result) {
            logger.info(`Đã xóa đánh giá ID: ${review_id} của người dùng ID: ${userId}`);
            res.status(200).json(createResponse('success', 'Đánh giá đã được xóa thành công.', 200, []));
        } else {
            logger.warn(`Không tìm thấy đánh giá ID: ${review_id} của người dùng ID: ${userId}`);
            res.status(200).json(createResponse('fail', 'Không tìm thấy đánh giá này hoặc bạn không có quyền xóa.', 404, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi xóa đánh giá: ${err.message}`, { meta: { request: req.body, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi xóa đánh giá.', 500, [], err.message));
    }
};