const pool = require('../configs/db.config');

const getBooks = async (filters = {}) => {
    let query = `
        SELECT b.book_id, b.title, b.url, b.image_url, b.excerpt, b.views, b.status, b.rating,
               a.author_id, a.name as author_name,
               c.category_id, c.name as category_name
        FROM books b
        LEFT JOIN authors a ON b.author_id = a.author_id
        LEFT JOIN categories c ON b.category_id = c.category_id
        WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    // Thêm điều kiện lọc theo thể loại
    if (filters.category_id) {
        query += ` AND b.category_id = $${paramCount++}`;
        values.push(filters.category_id);
    }

    // Thêm điều kiện lọc theo tác giả
    if (filters.author_id) {
        query += ` AND b.author_id = $${paramCount++}`;
        values.push(filters.author_id);
    }

    // Thêm điều kiện lọc theo trạng thái
    if (filters.status) {
        query += ` AND b.status = $${paramCount++}`;
        values.push(filters.status);
    }

    // Thêm sắp xếp
    query += ` ORDER BY b.created_at DESC`;

    // Thêm giới hạn và phân trang
    if (filters.limit) {
        query += ` LIMIT $${paramCount++}`;
        values.push(filters.limit);

        if (filters.offset) {
            query += ` OFFSET $${paramCount++}`;
            values.push(filters.offset);
        }
    }

    const result = await pool.query(query, values);
    return result.rows;
};

const searchBooks = async (keyword, limit = 20, offset = 0) => {
    const query = `
        SELECT b.book_id, b.title, b.url, b.image_url, b.excerpt, b.views, b.status, b.rating,
               a.author_id, a.name as author_name,
               c.category_id, c.name as category_name
        FROM books b
                 JOIN authors a ON b.author_id = a.author_id
                 JOIN categories c ON b.category_id = c.category_id
        WHERE
            unaccent(lower(b.title)) LIKE unaccent(lower($1)) OR
            unaccent(lower(a.name)) LIKE unaccent(lower($1)) OR
            unaccent(lower(c.name)) LIKE unaccent(lower($1))
        ORDER BY b.views DESC, b.created_at DESC
        LIMIT $2 OFFSET $3;
    `;
    const values = [`%${keyword}%`, limit, offset];

    try {
        const result = await pool.query(query, values);
        return result.rows;
    } catch (error) {
        console.error("Lỗi tìm kiếm:", error);
        throw error;
    }
};


const getTrendingBooks = async (limit = 10) => {
    const query = `
        SELECT b.book_id, b.title, b.url, b.image_url, b.excerpt, b.views, b.status, b.rating,
               a.author_id, a.name as author_name,
               c.category_id, c.name as category_name
        FROM books b
        LEFT JOIN authors a ON b.author_id = a.author_id
        LEFT JOIN categories c ON b.category_id = c.category_id
        ORDER BY b.views DESC
        LIMIT $1
    `;
    const values = [limit];

    const result = await pool.query(query, values);
    return result.rows;
};

const getChaptersByBookId = async (bookId) => {
    const query = `
        SELECT chapter_id, book_id, title, url, chapter_order, created_at, updated_at
        FROM chapters
        WHERE book_id = $1
        ORDER BY chapter_order ASC
    `;
    const values = [bookId];

    const result = await pool.query(query, values);
    return result.rows;
};


const getBookDetail = async (bookId, chapterOrder = null, userId) => {
    // Phần code lấy thông tin sách vẫn giữ nguyên
    const bookQuery = `
        SELECT b.book_id, b.title, b.url, b.image_url, b.excerpt, b.views, b.status, b.rating,
               a.author_id, a.name as author_name, a.biography as author_biography,
               c.category_id, c.name as category_name,
               b.created_at, b.updated_at
        FROM books b
                 LEFT JOIN authors a ON b.author_id = a.author_id
                 LEFT JOIN categories c ON b.category_id = c.category_id
        WHERE b.book_id = $1
    `;
    const bookResult = await pool.query(bookQuery, [bookId]);
    const book = bookResult.rows[0];

    if (!book) return null;

    // Truy vấn tổng số chương và đánh giá
    const [totalChaptersResult, totalReviewsResult] = await Promise.all([
        pool.query(`SELECT COUNT(*) as total_chapters FROM chapters WHERE book_id = $1`, [bookId]),
        pool.query(`SELECT COUNT(*) as total_reviews FROM book_reviews WHERE book_id = $1`, [bookId])
    ]);

    const totalChapters = parseInt(totalChaptersResult.rows[0].total_chapters) || 0;
    const totalReviews = parseInt(totalReviewsResult.rows[0].total_reviews) || 0;

    // Lấy danh sách các chương
    const chaptersListQuery = `
        SELECT chapter_id, title, url, chapter_order
        FROM chapters
        WHERE book_id = $1
        ORDER BY chapter_order ASC
    `;
    const chaptersListResult = await pool.query(chaptersListQuery, [bookId]);
    const chaptersList = chaptersListResult.rows;

    let chapterContent = null;

    // Nếu có chỉ định số chương, lấy nội dung của chương đó
    if (chapterOrder !== null) {
        const chapterQuery = `
            SELECT chapter_id, title, url, content, chapter_order, next_chapter_url, prev_chapter_url
            FROM chapters
            WHERE book_id = $1 AND chapter_order = $2
        `;
        const chapterResult = await pool.query(chapterQuery, [bookId, chapterOrder]);

        if (chapterResult.rows.length > 0) {
            chapterContent = {
                chapter_id: chapterResult.rows[0].chapter_id,
                title: chapterResult.rows[0].title,
                chapter_order: chapterResult.rows[0].chapter_order,
                next_chapter_url: chapterResult.rows[0].next_chapter_url,
                prev_chapter_url: chapterResult.rows[0].prev_chapter_url,
                content: chapterResult.rows[0].content
            };
        }
    }

    // Kiểm tra trạng thái yêu thích và theo dõi
    // Kiểm tra sách có được theo dõi không
    const subscriptionQuery = `
        SELECT is_active FROM book_subscriptions 
        WHERE user_id = $1 AND book_id = $2
    `;
    const subscriptionResult = await pool.query(subscriptionQuery, [userId, bookId]);
    const isSubscribed = subscriptionResult.rows.length > 0 && subscriptionResult.rows[0].is_active;

    // Kiểm tra sách có trong danh sách yêu thích không
    const favoriteQuery = `
        SELECT 1 FROM user_favorites 
        WHERE id = $1 AND book_id = $2
    `;
    const favoriteResult = await pool.query(favoriteQuery, [userId, bookId]);
    const isFavorited = favoriteResult.rows.length > 0;

    // Trả về thông tin sách kết hợp với danh sách chương và nội dung chương được chỉ định
    return {
        ...book,
        total_chapters: totalChapters,
        total_reviews: totalReviews,
        chapters: chaptersList,
        current_chapter: chapterContent,
        is_subscribed: isSubscribed,
        is_favorited: isFavorited
    };
};
module.exports = {
    getBooks,
    searchBooks,
    getTrendingBooks,
    getChaptersByBookId,
    getBookDetail
};