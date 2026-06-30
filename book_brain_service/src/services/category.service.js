const pool = require('../configs/db.config');

const getCategories = async () => {
    const query = `
        SELECT c.category_id, c.name, c.title, c.url, c.created_at
        FROM categories c
        WHERE EXISTS (
            SELECT 1
            FROM books b
            WHERE b.category_id = c.category_id AND b.is_visible = TRUE
        )
        ORDER BY c.name ASC
    `;
    const result = await pool.query(query);
    return result.rows;
};

module.exports = {
    getCategories,
};
