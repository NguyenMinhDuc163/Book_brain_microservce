const { createProxyMiddleware } = require('http-proxy-middleware');
const logger = require('../utils/logger');

/**
 * Tạo proxy middleware cho service
 * @param {string} serviceUrl - URL của service cần proxy
 * @param {object} options - Tùy chọn proxy
 * @returns {function} - Proxy middleware
 */
module.exports = (serviceUrl, options = {}) => {
    const defaultOptions = {
        target: serviceUrl,
        changeOrigin: true,
        pathRewrite: {},
        logLevel: 'debug',
        onError: (err, req, res) => {
            logger.error(`Proxy error: ${err.message}`);
            if (err.code === 'ECONNREFUSED') {
                res.status(503).json({
                    code: 503,
                    status: false,
                    message: 'Service hiện không khả dụng',
                    error: 'Service Unavailable'
                });
            } else if (err.code === 'ETIMEDOUT') {
                res.status(504).json({
                    code: 504,
                    status: false,
                    message: 'Yêu cầu đã hết thời gian chờ',
                    error: 'Gateway Timeout'
                });
            } else {
                res.status(500).json({
                    code: 500,
                    status: false,
                    message: 'Đã xảy ra lỗi khi chuyển tiếp yêu cầu',
                    error: 'Internal Server Error'
                });
            }
        },
        onProxyReq: (proxyReq, req, res) => {

            if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization);
            }


            proxyReq.setHeader('X-Forwarded-By', 'API-Gateway');


            if (req.headers['content-type']) {
                proxyReq.setHeader('Content-Type', req.headers['content-type']);
            }


            if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }


            logger.debug(`Proxy request từ ${req.method} ${req.originalUrl} đến ${serviceUrl}${proxyReq.path}`);
            logger.debug(`Request headers: ${JSON.stringify(proxyReq.getHeaders())}`);
            if (req.body) {
                logger.debug(`Request body: ${JSON.stringify(req.body)}`);
            }
        },
        onProxyRes: (proxyRes, req, res) => {

            logger.debug(`Proxy response status: ${proxyRes.statusCode}`);
            logger.debug(`Response headers: ${JSON.stringify(proxyRes.headers)}`);
        }
    };


    const proxyOptions = { ...defaultOptions, ...options };

    return createProxyMiddleware(proxyOptions);
};