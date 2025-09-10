const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const logger = require('../utils/logger');

const router = express.Router();

// Cấu hình URLs cho các services
const BOOK_SERVICE_URL = process.env.BOOK_BRAIN_URL || 'http://book_brain:3000';
const RECOMMENDATION_SERVICE_URL = process.env.RECOMMEND_URL || 'http://recommend:5000';

// Middleware để log request
router.use((req, res, next) => {
    logger.debug(`[Gateway] Received request: ${req.method} ${req.originalUrl}`);
    next();
});

// Cấu hình proxy cho Book Service
const createBookServiceProxy = () => createProxyMiddleware({
    target: BOOK_SERVICE_URL,
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
    proxyTimeout: 30000,
    timeout: 30000,
    keepAlive: true,
    ws: true,
    xfwd: true,
    pathRewrite: {
        '^/api/v1/express': '/api/v1', // Rewrite /api/v1/express to /api/v1
    },
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
const createRecommendationServiceProxy = () => createProxyMiddleware({
    target: RECOMMENDATION_SERVICE_URL,
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
    proxyTimeout: 30000,
    timeout: 30000,
    keepAlive: true,
    ws: true,
    xfwd: true,
    pathRewrite: {
        '^/api/v1/flask': '/api/v1', // Rewrite /api/v1/flask to /api/v1
    },
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

// Route cho Book Service (express suffix)
router.use('/api/v1/express', createBookServiceProxy());

// Route cho Recommendation Service (flask suffix)  
router.use('/api/v1/flask', createRecommendationServiceProxy());

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
            { path: '/api/v1/express/*', description: 'Book Service APIs (Express)' },
            { path: '/api/v1/flask/*', description: 'Recommendation Service APIs (Flask)' },
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