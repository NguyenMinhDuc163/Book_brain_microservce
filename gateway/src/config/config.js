const BOOK_BRAIN_URL = process.env.BOOK_BRAIN_URL;
const RECOMMEND_URL = process.env.RECOMMEND_URL;

if (!BOOK_BRAIN_URL || !RECOMMEND_URL) {
    throw new Error('Missing required env vars: BOOK_BRAIN_URL, RECOMMEND_URL');
}

module.exports = {
    server: {
        port: process.env.PORT || 8080,
        env: process.env.NODE_ENV || 'development',
    },
    services: {
        bookService: {
            url: BOOK_BRAIN_URL,
            options: {
                timeout: 10000,
                retry: {
                    attempts: 3,
                    delay: 1000
                },
                changeOrigin: true,
                secure: false,
                logLevel: 'debug'
            }
        },
        recommendationService: {
            url: RECOMMEND_URL,
            options: {
                timeout: 10000,
                retry: {
                    attempts: 3,
                    delay: 1000
                },
                changeOrigin: true,
                secure: false,
                logLevel: 'debug'
            }
        }
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        directory: 'logs',
    },
};