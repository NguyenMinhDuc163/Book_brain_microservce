const { getCategories } = require('../services/category.service');
const { createResponse } = require('../utils/responseHelper');
const { logger } = require('../utils/logger');

exports.getCategories = async (req, res) => {
    try {
        const categories = await getCategories();

        if (categories.length > 0) {
            logger.info('Danh sách thể loại đã được truy xuất thành công.');
            res.status(200).json(createResponse('success', 'Danh sách thể loại đã được truy xuất thành công.', 200, categories));
        } else {
            logger.warn('Không tìm thấy thể loại nào.');
            res.status(200).json(createResponse('fail', 'Không tìm thấy thể loại nào.', 404, []));
        }
    } catch (err) {
        logger.error(`Lỗi khi truy xuất danh sách thể loại: ${err.message}`, { meta: { error: err } });
        res.status(200).json(createResponse('fail', 'Lỗi khi truy xuất danh sách thể loại.', 500, [], err.message));
    }
};