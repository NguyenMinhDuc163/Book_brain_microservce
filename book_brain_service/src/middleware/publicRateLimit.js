const WINDOW_MS = Number(process.env.PUBLIC_RATE_LIMIT_WINDOW_MS) || 60_000;
const MAX_REQUESTS = Number(process.env.PUBLIC_RATE_LIMIT_MAX) || 600;

const createRateLimit = (windowMs, maxRequests) => {
    const buckets = new Map();

    return (req, res, next) => {
        const now = Date.now();
        const key = req.ip || req.socket?.remoteAddress || 'unknown';
        const current = buckets.get(key);

        if (!current || current.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        current.count += 1;
        if (current.count <= maxRequests) return next();

        const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
        res.set('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
            code: 429,
            data: [],
            status: 'fail',
            message: 'Too many requests',
            error: ''
        });
    };
};

const publicRateLimit = createRateLimit(WINDOW_MS, MAX_REQUESTS);
const authRateLimit = createRateLimit(
    Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 60_000,
    Number(process.env.AUTH_RATE_LIMIT_MAX) || 20
);

module.exports = { publicRateLimit, authRateLimit };
