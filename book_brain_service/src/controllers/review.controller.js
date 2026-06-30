const { createResponse } = require('../utils/responseHelper');
const { logger } = require('../utils/logger');
const { parsePositiveInteger, parsePagination } = require('../utils/requestValidation');
const reviewService = require('../services/review.service');

exports.addReview = async (req, res) => {
    try {
        const bookId = parsePositiveInteger(req.body.book_id);
        const rating = Number(req.body.rating);

        if (!bookId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json(createResponse('fail', 'book_id và rating từ 1 đến 5 là bắt buộc.', 400, []));
        }

        const review = await reviewService.addReview({
            book_id: bookId,
            user_id: req.user.userId,
            rating,
            comment: req.body.comment
        });

        return res.status(200).json(createResponse('success', 'Đánh giá đã được ghi nhận.', 200, [review]));
    } catch (error) {
        logger.error(`Lỗi khi thêm đánh giá: ${error.message}`);
        return res.status(500).json(createResponse('fail', 'Lỗi khi thêm đánh giá.', 500, []));
    }
};

exports.getBookReviews = async (req, res) => {
    try {
        const bookId = parsePositiveInteger(req.query.book_id);
        if (!bookId) {
            return res.status(400).json(createResponse('fail', 'Missing or invalid required parameter: book_id', 400, []));
        }

        const { page, limit } = parsePagination(req.query);
        const result = await reviewService.getBookReviews(bookId, page, limit);
        return res.status(200).json(createResponse('success', 'Danh sách đánh giá đã được truy xuất thành công.', 200, result.reviews));
    } catch (error) {
        logger.error(`Lỗi khi lấy danh sách đánh giá: ${error.message}`);
        return res.status(500).json(createResponse('fail', 'Lỗi khi lấy danh sách đánh giá.', 500, []));
    }
};

exports.getBookReviewStats = async (req, res) => {
    try {
        const bookId = parsePositiveInteger(req.query.bookId);
        if (!bookId) {
            return res.status(400).json(createResponse('fail', 'Missing or invalid required parameter: bookId', 400, []));
        }

        const stats = await reviewService.getBookReviewStats(bookId);
        return res.status(200).json(createResponse('success', 'Thống kê đánh giá đã được truy xuất thành công.', 200, [stats]));
    } catch (error) {
        logger.error(`Lỗi khi lấy thống kê đánh giá: ${error.message}`);
        return res.status(500).json(createResponse('fail', 'Lỗi khi lấy thống kê đánh giá.', 500, []));
    }
};

exports.deleteReview = async (req, res) => {
    try {
        const reviewId = parsePositiveInteger(req.body.review_id);
        if (!reviewId) {
            return res.status(400).json(createResponse('fail', 'Missing or invalid required parameter: review_id', 400, []));
        }

        const result = await reviewService.deleteReview(reviewId, req.user.userId);
        if (!result) {
            return res.status(404).json(createResponse('fail', 'Không tìm thấy đánh giá.', 404, []));
        }

        return res.status(200).json(createResponse('success', 'Đánh giá đã được xóa thành công.', 200, []));
    } catch (error) {
        logger.error(`Lỗi khi xóa đánh giá: ${error.message}`);
        return res.status(500).json(createResponse('fail', 'Lỗi khi xóa đánh giá.', 500, []));
    }
};
