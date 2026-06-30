const { createResponse } = require('../utils/responseHelper');
const { logger } = require('../utils/logger');
const { parsePositiveInteger, parsePagination } = require('../utils/requestValidation');

const {
    getBooks,
    searchBooks,
    getTrendingBooks,
    getChaptersByBookId,
    getBookDetail
} = require('../services/book.service');
exports.getBooks = async (req, res) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const categoryId = req.query.category_id === undefined ? null : parsePositiveInteger(req.query.category_id);
        const authorId = req.query.author_id === undefined ? null : parsePositiveInteger(req.query.author_id);

        if ((req.query.category_id !== undefined && !categoryId) ||
            (req.query.author_id !== undefined && !authorId)) {
            return res.status(400).json(createResponse('fail', 'Invalid book filter.', 400, []));
        }

        const filters = {
            category_id: categoryId,
            author_id: authorId,
            status: req.query.status,
            limit,
            offset: (page - 1) * limit
        };

        const books = await getBooks(filters);

        logger.info('Danh sách sách đã được truy xuất thành công.');
        res.status(200).json(createResponse('success', 'Danh sách sách đã được truy xuất thành công.', 200, books));
    } catch (err) {
        logger.error(`Lỗi khi truy xuất danh sách sách: ${err.message}`, { meta: { request: req.query, error: err } });
        res.status(500).json(createResponse('fail', 'Lỗi khi truy xuất danh sách sách.', 500, []));
    }
};

exports.searchBooks = async (req, res) => {
    const { keyword, limit } = req.query;

    if (!keyword || !keyword.trim()) {
        return res.status(200).json(createResponse('success', 'Danh sách tìm kiếm trống.', 200, []));
    }

    try {
        const safeLimit = Math.min(parsePositiveInteger(limit) || 10, 100);
        const books = await searchBooks(keyword.trim(), safeLimit);

        logger.info(`Tìm thấy ${books.length} sách với từ khóa "${keyword}".`);
        res.status(200).json(createResponse('success', `Tìm thấy ${books.length} sách với từ khóa "${keyword}".`, 200, books));
    } catch (err) {
        logger.error(`Lỗi khi tìm kiếm sách: ${err.message}`, { meta: { request: req.query, error: err } });
        res.status(500).json(createResponse('fail', 'Lỗi khi tìm kiếm sách.', 500, []));
    }
};

exports.getTrendingBooks = async (req, res) => {
    const { limit } = req.query;

    try {
        const books = await getTrendingBooks(Math.min(parsePositiveInteger(limit) || 10, 100));

        logger.info('Danh sách sách hot đã được truy xuất thành công.');
        res.status(200).json(createResponse('success', 'Danh sách sách hot đã được truy xuất thành công.', 200, books));
    } catch (err) {
        logger.error(`Lỗi khi truy xuất danh sách sách hot: ${err.message}`, { meta: { request: req.query, error: err } });
        res.status(500).json(createResponse('fail', 'Lỗi khi truy xuất danh sách sách hot.', 500, []));
    }
};



exports.getChaptersByBookId = async (req, res) => {
    const bookId = parsePositiveInteger(req.query.bookId);

    if (!bookId) {
        logger.warn('Thiếu ID sách.');
        return res.status(400).json(createResponse('fail', 'Missing or invalid required parameter: bookId', 400, []));
    }

    try {
        const chapters = await getChaptersByBookId(bookId);

        if (chapters.length > 0) {
            logger.info(`Đã lấy danh sách ${chapters.length} chương của sách ID: ${bookId}`);
            res.status(200).json(createResponse('success', 'Danh sách chương đã được truy xuất thành công.', 200, chapters));
        } else {
            logger.warn(`Không tìm thấy chương nào cho sách với ID: ${bookId}`);
            res.status(200).json(createResponse('success', 'Sách chưa có chương.', 200, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi lấy danh sách chương: ${err.message}`, { meta: { bookId, error: err } });
        res.status(500).json(createResponse('fail', 'Lỗi khi lấy danh sách chương.', 500, []));
    }
};

exports.getBookDetail = async (req, res) => {
    const bookId = parsePositiveInteger(req.query.id);
    const chapterOrder = req.query.chapter === undefined ? null : parsePositiveInteger(req.query.chapter);
    const userId = req.user?.userId || null;

    if (!bookId) {
        logger.warn('Thiếu ID sách.');
        return res.status(400).json(createResponse('fail', 'Missing or invalid required parameter: id', 400, []));
    }

    if (req.query.chapter !== undefined && !chapterOrder) {
        return res.status(400).json(createResponse('fail', 'Invalid parameter: chapter', 400, []));
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
                    res.status(404).json(createResponse('fail', `Không tìm thấy chương ${chapterOrder} cho sách này.`, 404, []));
                }
            } else {
                logger.info(`Đã lấy thông tin sách, ID: ${bookId}`);
                res.status(200).json(createResponse('success', 'Thông tin sách đã được truy xuất thành công.', 200, [book]));
            }
        } else {
            logger.warn(`Không tìm thấy sách với ID: ${bookId}`);
            res.status(404).json(createResponse('fail', 'Không tìm thấy sách.', 404, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi lấy thông tin sách và nội dung: ${err.message}`, { meta: { bookId, chapterOrder, error: err } });
        res.status(500).json(createResponse('fail', 'Lỗi khi lấy thông tin sách và nội dung.', 500, []));
    }
};
