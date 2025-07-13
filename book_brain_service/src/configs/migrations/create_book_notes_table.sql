CREATE TABLE IF NOT EXISTS book_notes (
    note_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
    chapter_id INTEGER REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    selected_text TEXT NOT NULL,
    note_content TEXT NOT NULL,
    start_position INTEGER NOT NULL,
    end_position INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo index cho các cột thường xuyên tìm kiếm
CREATE INDEX IF NOT EXISTS idx_book_notes_user ON book_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_book_notes_book ON book_notes(book_id);
CREATE INDEX IF NOT EXISTS idx_book_notes_chapter ON book_notes(chapter_id); 