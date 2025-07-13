// src/services/ranking.service.js
const pool = require('../configs/db.config');
const { logger } = require('../utils/logger');

// Lấy bảng xếp hạng sách
// ranking_score = views + (favorite_count * 5) + (avg_rating * 10)
const getBookRankings = async (limit = 10) => {
    try {
        const query = `
            SELECT brv.book_id, b.title, b.url, b.image_url, b.views, b.rating,
                   a.author_id, a.name as author_name,
                   c.category_id, c.name as category_name,
                   brv.ranking_score, brv.overall_rank,
                   brv.favorite_count, brv.avg_rating, brv.review_count
            FROM book_rankings_view brv
                     JOIN books b ON brv.book_id = b.book_id
                     LEFT JOIN authors a ON b.author_id = a.author_id
                     LEFT JOIN categories c ON b.category_id = c.category_id
            ORDER BY brv.overall_rank
                LIMIT $1
        `;

        const result = await pool.query(query, [limit]);
        return result.rows;
    } catch (error) {
        logger.error(`Lỗi khi lấy bảng xếp hạng sách: ${error.message}`);
        throw error;
    }
};

// Lấy danh sách tác giả xếp hạng cao
// author_score = (total_books * 2) + (total_views * 0.01) + (total_favorites * 5) + (avg_rating * 8)
const getAuthorRankings = async (limit = 10) => {
    try {
        const query = `
            SELECT 
                arv.author_id, 
                a.name, 
                arv.total_books, 
                arv.total_views, 
                arv.avg_rating, 
                arv.total_favorites, 
                arv.author_score, 
                arv.overall_rank
            FROM 
                author_rankings_view arv
            JOIN 
                authors a ON arv.author_id = a.author_id
            ORDER BY 
                arv.overall_rank
            LIMIT $1
        `;

        const result = await pool.query(query, [limit]);
        return result.rows;
    } catch (error) {
        logger.error(`Lỗi khi lấy danh sách tác giả xếp hạng cao: ${error.message}`);
        throw error;
    }
};


module.exports = {
    getBookRankings,
    getAuthorRankings,
};