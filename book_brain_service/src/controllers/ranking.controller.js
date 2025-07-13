// src/controllers/ranking.controller.js
const { createResponse } = require('../utils/responseHelper');
const { logger } = require('../utils/logger');
const rankingService = require('../services/ranking.service');

// Lấy bảng xếp hạng sách
exports.getBookRankings = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;

        const rankings = await rankingService.getBookRankings(limit);

        logger.info(`Đã lấy bảng xếp hạng với ${rankings.length} sách`);
        res.status(200).json(createResponse('success', 'Bảng xếp hạng sách đã được truy xuất thành công.', 200, rankings));
    } catch (err) {
        logger.error(`Lỗi khi lấy bảng xếp hạng sách: ${err.message}`, { meta: { request: req.query, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi lấy bảng xếp hạng sách.', 500, [], err.message));
    }
};

// Lấy danh sách tác giả xếp hạng cao
exports.getAuthorRankings = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;

        const authors = await rankingService.getAuthorRankings(limit);

        logger.info(`Đã lấy ${authors.length} tác giả xếp hạng cao`);
        res.status(200).json(createResponse('success', 'Danh sách tác giả xếp hạng cao đã được truy xuất thành công.', 200, authors));
    } catch (err) {
        logger.error(`Lỗi khi lấy danh sách tác giả xếp hạng cao: ${err.message}`, { meta: { request: req.query, error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi lấy danh sách tác giả xếp hạng cao.', 500, [], err.message));
    }
};
