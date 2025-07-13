require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    logger.info(`API Gateway đang chạy trên cổng ${PORT}`);
});