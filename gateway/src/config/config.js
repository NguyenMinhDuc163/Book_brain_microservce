module.exports = {
    server: {
        port: process.env.PORT || 8080,
        env: process.env.NODE_ENV || 'development',
    },
    services: {
        bookService: {
            url: process.env.BOOK_SERVICE_URL || 'http://localhost:3000',
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
            url: process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:5000',
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