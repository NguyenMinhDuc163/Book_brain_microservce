const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const http = require('node:http');

process.env.DB_TYPE = 'postgres';
process.env.JWT_SECRET = 'contract-test-secret';
process.env.NODE_ENV = 'test';

const pool = require('../src/configs/db.config');
const {
    extractBearerToken,
    optionalAuth,
    requireAuth
} = require('../src/middleware/authMiddleware');
const { parsePagination, parsePositiveInteger, parseTemporaryBoolean } = require('../src/utils/requestValidation');
const bookService = require('../src/services/book.service');
const reviewService = require('../src/services/review.service');
const rankingService = require('../src/services/ranking.service');
const UserModel = require('../src/models/user.model');
const UserService = require('../src/services/user.service');
const app = require('../src/app');

const requestApp = (path, options = {}) => new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
        const request = http.request({
            hostname: '127.0.0.1',
            port: server.address().port,
            path,
            method: options.method || 'GET',
            headers: options.headers || {}
        }, (response) => {
            let raw = '';
            response.on('data', (chunk) => { raw += chunk; });
            response.on('end', () => {
                server.close();
                resolve({ status: response.statusCode, body: JSON.parse(raw) });
            });
        });
        request.on('error', (error) => { server.close(); reject(error); });
        if (options.body) request.write(JSON.stringify(options.body));
        request.end();
    });
});

const runMiddleware = (middleware, authorization) => new Promise((resolve) => {
    const req = { headers: {}, method: 'GET', path: '/api/v1/books' };
    if (authorization !== undefined) req.headers.authorization = authorization;
    const res = {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; resolve({ req, res: this, nextCalled: false }); }
    };
    middleware(req, res, () => resolve({ req, res, nextCalled: true }));
});

test('token extraction treats Flutter guest header variants as empty', () => {
    for (const value of [undefined, '', 'Bearer', 'Bearer ', 'Bearer null', 'Bearer undefined', 'null', 'undefined']) {
        assert.equal(extractBearerToken(value), null);
    }
    assert.equal(extractBearerToken('Basic abc'), null);
    assert.equal(extractBearerToken('Bearer real-token'), 'real-token');
});

test('optional auth degrades missing, empty, expired and malformed JWTs to guest', async () => {
    for (const value of [undefined, 'Bearer ', 'Bearer null', 'Bearer invalid-token']) {
        const result = await runMiddleware(optionalAuth, value);
        assert.equal(result.nextCalled, true);
        assert.equal(result.req.user, null);
    }
});

test('optional auth preserves a valid logged-in identity', async () => {
    const token = jwt.sign({ userId: 7 }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const result = await runMiddleware(optionalAuth, `Bearer ${token}`);
    assert.equal(result.nextCalled, true);
    assert.equal(result.req.user.userId, 7);
});

test('strict auth returns aligned HTTP/body 401 for guest and invalid tokens', async () => {
    for (const value of [undefined, 'Bearer ', 'Bearer null', 'Bearer invalid-token']) {
        const result = await runMiddleware(requireAuth, value);
        assert.equal(result.nextCalled, false);
        assert.equal(result.res.statusCode, 401);
        assert.equal(result.res.body.code, 401);
        assert.deepEqual(result.res.body.data, []);
    }
});

test('strict auth accepts only a valid token for an active account', async (t) => {
    const originalQuery = pool.query;
    pool.query = async () => ({ rows: [{ id: 7 }] });
    t.after(() => { pool.query = originalQuery; });

    const token = jwt.sign({ userId: 7 }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const result = await runMiddleware(requireAuth, `Bearer ${token}`);
    assert.equal(result.nextCalled, true);
    assert.equal(result.req.user.userId, 7);
});

test('request compatibility parsers bound pagination and numeric active_only', () => {
    assert.equal(parsePositiveInteger('12'), 12);
    assert.equal(parsePositiveInteger('0'), null);
    assert.equal(parsePositiveInteger('1 OR 1=1'), null);
    assert.deepEqual(parsePagination({ page: '2', limit: '500' }), { page: 2, limit: 100 });
    assert.equal(parseTemporaryBoolean('true'), true);
    assert.equal(parseTemporaryBoolean('1'), true);
    assert.equal(parseTemporaryBoolean('10'), true);
    assert.equal(parseTemporaryBoolean('false'), false);
    assert.equal(parseTemporaryBoolean('0'), false);
});

test('public routes accept invalid guest JWT and validate missing content IDs before DB access', async () => {
    const headers = { Authorization: 'Bearer invalid-token' };
    for (const path of ['/api/v1/detailBook', '/api/v1/books/chapters', '/api/v1/books_reviews', '/api/v1/reviews/stats']) {
        const response = await requestApp(path, { headers });
        assert.equal(response.status, 400, path);
        assert.equal(response.body.code, 400, path);
    }

    const emptySearch = await requestApp('/api/v1/books/search', { headers: { Authorization: 'Bearer ' } });
    assert.equal(emptySearch.status, 200);
    assert.deepEqual(emptySearch.body.data, []);
});

test('every private mobile route returns real 401 without reaching its controller', async () => {
    const routes = [
        ['GET', '/api/v1/favorites'], ['POST', '/api/v1/favorites'],
        ['GET', '/api/v1/subscriptions'], ['POST', '/api/v1/subscriptions'],
        ['GET', '/api/v1/notifications'], ['POST', '/api/v1/notifications'],
        ['GET', '/api/v1/reading_history'], ['POST', '/api/v1/reading_history'],
        ['GET', '/api/v1/book_notes'], ['POST', '/api/v1/book_notes'],
        ['POST', '/api/v1/book_notes/delete'], ['POST', '/api/v1/reviews'],
        ['POST', '/api/v1/reviews/delete'], ['POST', '/api/v1/auth/update'],
        ['POST', '/api/v1/auth/change_password'], ['POST', '/api/v1/auth/delete']
    ];

    for (const [method, path] of routes) {
        const response = await requestApp(path, {
            method,
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer null' },
            body: {}
        });
        assert.equal(response.status, 401, `${method} ${path}`);
        assert.equal(response.body.code, 401, `${method} ${path}`);
    }
});

test('guest detail never executes account queries and returns false flags', async (t) => {
    const originalQuery = pool.query;
    const seenQueries = [];
    pool.query = async (sql) => {
        seenQueries.push(sql);
        if (sql.includes('FROM books b')) return { rows: [{ book_id: 12, title: 'Book', rating: '4.5' }] };
        if (sql.includes('total_chapters')) return { rows: [{ total_chapters: '1' }] };
        if (sql.includes('total_reviews')) return { rows: [{ total_reviews: '0' }] };
        if (sql.includes('SELECT chapter_id, title, url, chapter_order')) return { rows: [] };
        return { rows: [] };
    };
    t.after(() => { pool.query = originalQuery; });

    const detail = await bookService.getBookDetail(12, null, null);
    assert.equal(detail.is_favorited, false);
    assert.equal(detail.is_subscribed, false);
    assert.equal(seenQueries.some((sql) => sql.includes('user_favorites')), false);
    assert.equal(seenQueries.some((sql) => sql.includes('book_subscriptions')), false);
});

test('authenticated detail flags are isolated per token user', async (t) => {
    const originalQuery = pool.query;
    pool.query = async (sql, params) => {
        if (sql.includes('FROM books b')) return { rows: [{ book_id: 12, title: 'Book', rating: '4.5' }] };
        if (sql.includes('total_chapters')) return { rows: [{ total_chapters: '1' }] };
        if (sql.includes('total_reviews')) return { rows: [{ total_reviews: '0' }] };
        if (sql.includes('SELECT chapter_id, title, url, chapter_order')) return { rows: [] };
        if (sql.includes('book_subscriptions')) return { rows: params[0] === 7 ? [{ '?column?': 1 }] : [] };
        if (sql.includes('user_favorites')) return { rows: params[0] === 7 ? [{ '?column?': 1 }] : [] };
        return { rows: [] };
    };
    t.after(() => { pool.query = originalQuery; });

    const userA = await bookService.getBookDetail(12, null, 7);
    const userB = await bookService.getBookDetail(12, null, 8);
    assert.equal(userA.is_favorited, true);
    assert.equal(userA.is_subscribed, true);
    assert.equal(userB.is_favorited, false);
    assert.equal(userB.is_subscribed, false);
});

test('review stats always serialize one complete zero-compatible string object', async (t) => {
    const originalQuery = pool.query;
    pool.query = async () => ({
        rows: [{
            total_reviews: '0', average_rating: null, five_star: '0', four_star: '0',
            three_star: '0', two_star: '0', one_star: '0'
        }]
    });
    t.after(() => { pool.query = originalQuery; });

    const stats = await reviewService.getBookReviewStats(12);
    assert.deepEqual(stats, {
        total_reviews: '0', average_rating: '0.0', five_star: '0', four_star: '0',
        three_star: '0', two_star: '0', one_star: '0'
    });
    for (const value of Object.values(stats)) assert.equal(typeof value, 'string');
});

test('ranking fields required by Dart remain JSON strings', async (t) => {
    const originalQuery = pool.query;
    pool.query = async (sql) => {
        if (sql.includes('book_rankings_view')) {
            return { rows: [{
                book_id: 1, rating: 4.5, ranking_score: 9.5, overall_rank: 1,
                favorite_count: 2, avg_rating: 4.25, review_count: 3
            }] };
        }
        return { rows: [{
            author_id: 1, total_books: 2, total_views: 10, avg_rating: 4.5,
            total_favorites: 3, author_score: 8.5, overall_rank: 1
        }] };
    };
    t.after(() => { pool.query = originalQuery; });

    const [book] = await rankingService.getBookRankings(1);
    const [author] = await rankingService.getAuthorRankings(1);
    for (const key of ['rating', 'ranking_score', 'overall_rank', 'favorite_count', 'avg_rating', 'review_count']) {
        assert.equal(typeof book[key], 'string');
    }
    for (const key of ['total_books', 'total_views', 'avg_rating', 'total_favorites', 'author_score', 'overall_rank']) {
        assert.equal(typeof author[key], 'string');
    }
});

test('registration and profile update normalize the mobile phone sentinel', async (t) => {
    const originals = {
        findByEmail: UserModel.findByEmail,
        findById: UserModel.findById,
        findByUsername: UserModel.findByUsername,
        register: UserModel.register,
        updateUser: UserModel.updateUser
    };
    const registered = [];
    const updated = [];
    UserModel.findByEmail = async () => null;
    UserModel.findById = async () => ({ id: 7, username: 'reader', email: 'old@example.com' });
    UserModel.findByUsername = async () => null;
    UserModel.register = async (data) => { registered.push(data); return [{ id: registered.length }]; };
    UserModel.updateUser = async (id, data) => { updated.push(data); return { id }; };
    t.after(() => Object.assign(UserModel, originals));

    const base = { username: 'reader', email: 'one@example.com', password: 'secret1' };
    await UserService.registerUser(base);
    await UserService.registerUser({ ...base, email: 'two@example.com', phone_number: '0987654321' });
    await UserService.updateUserInfo({ id: 7, username: 'reader2', phone_number: '0987654321' });

    assert.equal(registered[0].phone_number, null);
    assert.equal(registered[1].phone_number, null);
    assert.equal(updated[0].phone_number, undefined);
});

test('account deletion purges private rows and anonymizes credentials transactionally', async (t) => {
    const originalConnect = pool.connect;
    const queries = [];
    const client = {
        async query(sql, params) {
            queries.push({ sql, params });
            if (sql.includes('UPDATE users')) {
                return { rows: [{ id: 7, username: 'deleted_user_7', is_verified: true }] };
            }
            return { rows: [] };
        },
        release() {}
    };
    pool.connect = async () => client;
    t.after(() => { pool.connect = originalConnect; });

    const result = await UserModel.deleteUser(7, 'unusable-hash');
    assert.equal(result.is_verified, true);
    assert.equal(queries[0].sql, 'BEGIN');
    assert.equal(queries.at(-1).sql, 'COMMIT');
    for (const table of [
        'review_votes', 'book_reviews', 'book_notes', 'notifications',
        'book_subscriptions', 'reading_history', 'user_reading_progress',
        'bookmarks', 'user_favorites'
    ]) {
        assert.equal(queries.some(({ sql }) => sql.includes(table)), true, table);
    }
    const anonymize = queries.find(({ sql }) => sql.includes('UPDATE users'));
    assert.equal(anonymize.params[0], 7);
    assert.equal(anonymize.params[1], 'deleted_user_7');
    assert.equal(anonymize.params[3], 'unusable-hash');
});
