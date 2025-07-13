const pool = require('../configs/db.config');

const getCategories = async () => {
    const query = `
        SELECT category_id, name, title, url, created_at
        FROM categories
        ORDER BY name ASC
    `;
    const result = await pool.query(query);
    return result.rows;
};

module.exports = {
    getCategories,
};