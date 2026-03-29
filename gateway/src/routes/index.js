const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const logger = require('../utils/logger');

const router = express.Router();

// Cấu hình URLs cho các services
const BOOK_SERVICE_URL = process.env.BOOK_BRAIN_URL;
const RECOMMENDATION_SERVICE_URL = process.env.RECOMMEND_URL;

if (!BOOK_SERVICE_URL || !RECOMMENDATION_SERVICE_URL) {
    throw new Error('Missing required env vars: BOOK_BRAIN_URL, RECOMMEND_URL');
}

// Middleware để log request
router.use((req, res, next) => {
    logger.debug(`[Gateway] Received request: ${req.method} ${req.originalUrl}`);
    next();
});

// Cấu hình proxy cho Book Service
const bookServiceProxy = createProxyMiddleware({
    target: BOOK_SERVICE_URL,
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
    proxyTimeout: 30000,
    timeout: 30000,
    keepAlive: true,
    ws: true,
    xfwd: true,
    onProxyReq: (proxyReq, req, res) => {
        // Giữ nguyên headers
        if (req.headers.authorization) {
            proxyReq.setHeader('Authorization', req.headers.authorization);
        }
        if (req.headers.cookie) {
            proxyReq.setHeader('Cookie', req.headers.cookie);
        }
        
        logger.debug(`[Book Service] Original URL: ${req.originalUrl}`);
        logger.debug(`[Book Service] Proxy URL: ${proxyReq.path}`);
        
        if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    },
    onProxyRes: (proxyRes, req, res) => {
        logger.debug(`[Book Service] Response status: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        logger.error('[Book Service] Proxy Error:', err);
        res.status(503).json({
            code: 503,
            status: false,
            message: 'Book Service không khả dụng',
            error: err.message
        });
    }
});

// Cấu hình proxy cho Recommendation Service
const recommendationServiceProxy = createProxyMiddleware({
    target: RECOMMENDATION_SERVICE_URL,
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
    proxyTimeout: 30000,
    timeout: 30000,
    keepAlive: true,
    ws: true,
    xfwd: true,
    onProxyReq: (proxyReq, req, res) => {
        // Giữ nguyên headers
        if (req.headers.authorization) {
            proxyReq.setHeader('Authorization', req.headers.authorization);
        }
        if (req.headers.cookie) {
            proxyReq.setHeader('Cookie', req.headers.cookie);
        }
        
        logger.debug(`[Recommendation Service] Original URL: ${req.originalUrl}`);
        logger.debug(`[Recommendation Service] Proxy URL: ${proxyReq.path}`);
        
        if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    },
    onProxyRes: (proxyRes, req, res) => {
        logger.debug(`[Recommendation Service] Response status: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        logger.error('[Recommendation Service] Proxy Error:', err);
        res.status(503).json({
            code: 503,
            status: false,
            message: 'Recommendation Service không khả dụng',
            error: err.message
        });
    }
});

// Định nghĩa routes cho Book Service - xử lý tất cả các API từ Book Service
router.use('/api/v1', (req, res, next) => {
    // Nếu là API của Recommendation Service
    if (req.path.startsWith('/recommendations')) {
        return recommendationServiceProxy(req, res, next);
    }
    // Các API còn lại đều thuộc Book Service
    return bookServiceProxy(req, res, next);
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        code: 200,
        status: true,
        message: 'API Gateway is healthy',
        data: {
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        }
    });
});

// Root endpoint
router.get('/', (req, res) => {
    res.json({
        message: 'API Gateway đang hoạt động',
        endpoints: [
            { path: '/api/v1/*', description: 'Book Service APIs' },
            { path: '/api/v1/recommendations', description: 'Recommendation Service APIs' },
            { path: '/health', description: 'Kiểm tra trạng thái API Gateway' }
        ],
    });
});

// 404 handler
router.use((req, res) => {
    logger.debug(`[Gateway] 404 Not Found: ${req.originalUrl}`);
    res.status(404).json({
        error: 'Not Found',
        message: `Không tìm thấy endpoint cho ${req.originalUrl}`,
    });
});

module.exports = router;