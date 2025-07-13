const express = require('express');

require('dotenv').config();
const app = express();
const cors = require('cors');
const authRouter = require('./routes/auth.router'); // Route công khai
const categoryRouter = require('./routes/category.router');
const { logMiddleware } = require('./utils/logger');
const { authenticateJWT } = require('./middleware/authMiddleware'); // Middleware xác thực JWT
const bookRouter = require('./routes/book.router');
const reviewRouter = require('./routes/review.router');
const favoriteRouter = require('./routes/favorite.router');
const subscriptionRouter = require('./routes/subscription.router');
const notificationRouter = require('./routes/notification.router');
const readingHistoryRouter = require('./routes/reading-history.router');
const rankingRouter = require('./routes/ranking.router');
const bookNoteRouter = require('./routes/book_note.router');

// Middleware để parse JSON và ghi log
app.use(express.json());
app.use(logMiddleware);

// Cấu hình CORS
app.use(cors({
    origin: 'https://reset.nguyenduc.click', // Miền được phép
    methods: 'GET,POST,PUT,DELETE', // Các phương thức được phép
    allowedHeaders: 'Content-Type,Authorization', // Các header được phép
}));

// Middleware xác thực JWT cho toàn bộ route, trừ route công khai
app.use((req, res, next) => {
    const publicRoutes = [
        '/api/v1/auth/login',
        '/api/v1/auth/register',
        '/api/v1/auth/forgot_password',
        '/'
    ]; // Danh sách các route công khai

    if (publicRoutes.includes(req.path)) {
        return next(); // Bỏ qua xác thực nếu là route công khai
    }

    authenticateJWT(req, res, next); // Thực hiện xác thực JWT
});

// app.get('/favicon.ico', (req, res) => {
//     res.status(204).send(); // Trả về mã 204 nếu không có favicon
// });
// Route công khai
app.use(authRouter);

// Các route yêu cầu xác thực JWT
app.use(categoryRouter);
app.use(bookRouter);
app.use(reviewRouter);
app.use(favoriteRouter);
app.use(subscriptionRouter);
app.use(notificationRouter);
app.use(readingHistoryRouter);
app.use(rankingRouter);
app.use(bookNoteRouter);

app.use((req, res, next) => {
    res.status(200).json({
        code: 404,
        status: 'fail',
        message: 'API endpoint not found',
        error: ''
    });
});

module.exports = app;
