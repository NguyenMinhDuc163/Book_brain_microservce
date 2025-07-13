const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
    logger.error(`Error: ${err.message}`);
    logger.error(err.stack);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        code: statusCode,
        status: false,
        message: message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};