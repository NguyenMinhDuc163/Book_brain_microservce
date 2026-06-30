const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const expectOccurrences = (source, pattern, minimum, label) => {
    const matches = source.match(pattern) || [];
    assert.ok(matches.length >= minimum, `${label}: expected at least ${minimum} visibility guards, found ${matches.length}`);
};

test('every API that reads or mutates book content has a visibility guard', () => {
    const contracts = [
        ['book_brain_service/src/services/book.service.js', /is_visible\s*=\s*TRUE/gi, 5, 'books/search/trending/chapters/detail'],
        ['book_brain_service/src/services/category.service.js', /is_visible\s*=\s*TRUE/gi, 1, 'categories'],
        ['book_brain_service/src/services/favorite.service.js', /is_visible\s*=\s*TRUE/gi, 3, 'favorites'],
        ['book_brain_service/src/services/subscription.service.js', /is_visible\s*=\s*TRUE/gi, 3, 'subscriptions'],
        ['book_brain_service/src/services/reading-history.service.js', /is_visible\s*=\s*TRUE/gi, 4, 'reading history'],
        ['book_brain_service/src/services/review.service.js', /is_visible\s*=\s*TRUE/gi, 4, 'reviews'],
        ['book_brain_service/src/services/bookNote.service.js', /is_visible\s*=\s*TRUE/gi, 3, 'book notes'],
        ['book_brain_service/src/services/notification.service.js', /is_visible\s*=\s*TRUE/gi, 5, 'notifications'],
        ['book_brain_service/src/services/ranking.service.js', /is_visible\s*=\s*TRUE/gi, 1, 'rankings'],
        ['recommend_service/services/db_service.py', /is_visible\s*=\s*TRUE/gi, 5, 'recommendation database reads']
    ];

    for (const [file, pattern, minimum, label] of contracts) {
        expectOccurrences(read(file), pattern, minimum, label);
    }
});

test('recommendation responses discard stale cached books hidden after cache creation', () => {
    const source = read('recommend_service/app.py');
    assert.match(source, /visible_recommendations\s*=\s*\[\]/);
    assert.match(source, /if detail:[\s\S]*visible_recommendations\.append\(rec\)/);
    assert.match(source, /["']data["']:\s*visible_recommendations/);
});

test('database ranking views only contain approved books and authors', () => {
    const migration = read('book_brain_service/src/configs/migrations/add_book_visibility.sql');
    assert.match(migration, /CREATE OR REPLACE VIEW public\.book_rankings_view[\s\S]*WHERE b\.is_visible = TRUE/);
    assert.match(migration, /CREATE OR REPLACE VIEW public\.author_rankings_view[\s\S]*b2\.is_visible = TRUE/);
    assert.match(migration, /HAVING COUNT\(b\.book_id\) > 0/);
});
