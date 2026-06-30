const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const SENSITIVE_KEYS = new Set(['password', 'oldpassword', 'newpassword', 'token', 'token_fcm', 'click_send_key']);
const redactSensitive = (value) => {
    if (Array.isArray(value)) return value.map(redactSensitive);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redactSensitive(item)
    ]));
};

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

app.use((req, res, next) => {
    if (req.body && Object.keys(req.body).length > 0) {
        logger.debug(`Request body: ${JSON.stringify(redactSensitive(req.body))}`);
    }
    next();
});

// Mount routes without /api prefix since it's already in the routes
app.use('/', routes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', time: new Date().toISOString() });
});

app.use(errorHandler);

module.exports = app;
