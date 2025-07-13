const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

app.use((req, res, next) => {
    if (req.body && Object.keys(req.body).length > 0) {
        logger.debug(`Request body: ${JSON.stringify(req.body)}`);
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