const { createResponse } = require('../utils/responseHelper');
const { logger } = require('../utils/logger');

const {
    getBooks,
    searchBooks,
    getTrendingBooks,
    getChaptersByBookId,
    getBookDetail
} = require('../services/book.service');
exports.getBooks = async (req, res) => {
    try {
        const filters = {
            category_id: req.query.category_id,
            author_id: req.query.author_id,
            status: req.query.status,
            limit: req.query.limit ? parseInt(req.query.limit) : 10,
            offset: req.query.page ? (parseInt(req.query.page) - 1) * (req.query.limit ? parseInt(req.query.limit) : 10) : 0
        };

        const books = await getBooks(filters);

        if (books.length > 0) {
            logger.info('Danh sách sách đã được truy xuất thành công.');
            res.status(200).json(createResponse('success', 'Danh sách sách đã được truy xuất thành công.', 200, books));
        } else {
            logger.warn('Không tìm thấy sách nào.');
            res.status(200).json(createResponse('fail', 'Không tìm thấy sách nào.', 404, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi truy xuất danh sách sách: ${err.message}`, { meta: { request: req.query, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi truy xuất danh sách sách.', 500, [], err.message));
    }
};

exports.searchBooks = async (req, res) => {
    const { keyword, limit } = req.query;

    if (!keyword) {
        logger.warn('Thiếu từ khóa tìm kiếm.');
        return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp từ khóa tìm kiếm.', 400, []));
    }

    try {
        const books = await searchBooks(keyword, limit ? parseInt(limit) : 10);

        if (books.length > 0) {
            logger.info(`Tìm thấy ${books.length} sách với từ khóa "${keyword}".`);
            res.status(200).json(createResponse('success', `Tìm thấy ${books.length} sách với từ khóa "${keyword}".`, 200, books));
        } else {
            logger.warn(`Không tìm thấy sách nào với từ khóa "${keyword}".`);
            res.status(200).json(createResponse('fail', `Không tìm thấy sách nào với từ khóa "${keyword}".`, 404, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi tìm kiếm sách: ${err.message}`, { meta: { request: req.query, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi tìm kiếm sách.', 500, [], err.message));
    }
};

exports.getTrendingBooks = async (req, res) => {
    const { limit } = req.query;

    try {
        const books = await getTrendingBooks(limit ? parseInt(limit) : 10);

        if (books.length > 0) {
            logger.info('Danh sách sách hot đã được truy xuất thành công.');
            res.status(200).json(createResponse('success', 'Danh sách sách hot đã được truy xuất thành công.', 200, books));
        } else {
            logger.warn('Không tìm thấy sách hot nào.');
            res.status(200).json(createResponse('fail', 'Không tìm thấy sách hot nào.', 404, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi truy xuất danh sách sách hot: ${err.message}`, { meta: { request: req.query, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi truy xuất danh sách sách hot.', 500, [], err.message));
    }
};



exports.getChaptersByBookId = async (req, res) => {
    const bookId = req.query.bookId;

    if (!bookId) {
        logger.warn('Thiếu ID sách.');
        return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp ID sách.', 400, []));
    }

    try {
        const chapters = await getChaptersByBookId(bookId);

        if (chapters.length > 0) {
            logger.info(`Đã lấy danh sách ${chapters.length} chương của sách ID: ${bookId}`);
            res.status(200).json(createResponse('success', 'Danh sách chương đã được truy xuất thành công.', 200, chapters));
        } else {
            logger.warn(`Không tìm thấy chương nào cho sách với ID: ${bookId}`);
            res.status(200).json(createResponse('fail', 'Không tìm thấy chương nào cho sách này.', 404, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi lấy danh sách chương: ${err.message}`, { meta: { bookId, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi lấy danh sách chương.', 500, [], err.message));
    }
};

exports.getBookDetail = async (req, res) => {
    const bookId = req.query.id;
    const chapterOrder = req.query.chapter ? parseInt(req.query.chapter) : null;
    const userId = req.user.userId; // Lấy userId từ token JWT

    if (!bookId) {
        logger.warn('Thiếu ID sách.');
        return res.status(200).json(createResponse('fail', 'Vui lòng cung cấp ID sách.', 400, []));
    }

    try {
        const book = await getBookDetail(bookId, chapterOrder, userId);

        if (book) {
            if (chapterOrder) {
                if (book.current_chapter) {
                    logger.info(`Đã lấy thông tin sách và nội dung chương ${chapterOrder}, ID sách: ${bookId}`);
                    res.status(200).json(createResponse('success', `Thông tin sách và nội dung chương ${chapterOrder} đã được truy xuất thành công.`, 200, [book]));
                } else {
                    logger.warn(`Không tìm thấy chương ${chapterOrder} cho sách ID: ${bookId}`);
                    res.status(200).json(createResponse('fail', `Không tìm thấy chương ${chapterOrder} cho sách này.`, 404, [book]));
                }
            } else {
                logger.info(`Đã lấy thông tin sách, ID: ${bookId}`);
                res.status(200).json(createResponse('success', 'Thông tin sách đã được truy xuất thành công.', 200, [book]));
            }
        } else {
            logger.warn(`Không tìm thấy sách với ID: ${bookId}`);
            res.status(200).json(createResponse('fail', 'Không tìm thấy sách.', 404, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi lấy thông tin sách và nội dung: ${err.message}`, { meta: { bookId, chapterOrder, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi lấy thông tin sách và nội dung.', 500, [], err.message));
    }
};