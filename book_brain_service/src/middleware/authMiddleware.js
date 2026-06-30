const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const pool = require('../configs/db.config');

const EMPTY_TOKEN_VALUES = new Set(['', 'bearer', 'null', 'undefined']);

const extractBearerToken = (authorizationHeader) => {
    if (typeof authorizationHeader !== 'string') return null;

    const value = authorizationHeader.trim();
    const lowerValue = value.toLowerCase();

    if (EMPTY_TOKEN_VALUES.has(lowerValue) || !lowerValue.startsWith('bearer ')) {
        return null;
    }

    const token = value.slice(7).trim();
    if (EMPTY_TOKEN_VALUES.has(token.toLowerCase())) return null;

    return token;
};

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

const optionalAuth = (req, res, next) => {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        req.user = verifyToken(token);
    } catch (error) {
        // Public content deliberately degrades an invalid/expired token to guest.
        req.user = null;
        logger.warn(`Public request is using guest mode: ${req.method} ${req.path}`);
    }

    return next();
};

const unauthorized = (res) => res.status(401).json({
    code: 401,
    data: [],
    status: 'fail',
    message: 'Unauthorized',
    error: ''
});

const requireAuth = async (req, res, next) => {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
        return unauthorized(res);
    }

    try {
        const decoded = verifyToken(token);
        const userId = decoded?.userId;
        if (!Number.isInteger(userId) || userId <= 0) return unauthorized(res);

        // A signed token alone is insufficient after account deletion/locking.
        const account = await pool.query(
            'SELECT id FROM users WHERE id = $1 AND is_verified = false',
            [userId]
        );
        if (account.rows.length === 0) return unauthorized(res);

        req.user = decoded;
        return next();
    } catch (error) {
        logger.warn(`Unauthorized request: ${req.method} ${req.path}`);
        return unauthorized(res);
    }
};

module.exports = {
    extractBearerToken,
    optionalAuth,
    requireAuth,
    authenticateJWT: requireAuth
};
