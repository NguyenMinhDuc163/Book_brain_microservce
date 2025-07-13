\c book_brain

-- Bảng Categories (Chủ đề/Thể loại)
CREATE TABLE categories (
                            category_id SERIAL PRIMARY KEY,
                            name VARCHAR(100) NOT NULL,
                            title VARCHAR(100) NOT NULL,
                            url VARCHAR(255) UNIQUE,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Authors (Tác giả)
CREATE TABLE authors (
                         author_id SERIAL PRIMARY KEY,
                         name VARCHAR(100) NOT NULL UNIQUE,
                         biography TEXT,
                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Books (Sách/Truyện)
CREATE TABLE books (
                       book_id SERIAL PRIMARY KEY,
                       title VARCHAR(255) NOT NULL,
                       url VARCHAR(255) UNIQUE NOT NULL,
                       image_url VARCHAR(255),
                       author_id INTEGER REFERENCES authors(author_id),
                       excerpt TEXT,
                       views INTEGER DEFAULT 0,
                       status VARCHAR(20) CHECK (status IN ('Full', 'Updating', 'Pending')),
                       rating VARCHAR(10),
                       category_id INTEGER REFERENCES categories(category_id),
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Chapters (Chương)
CREATE TABLE chapters (
                          chapter_id SERIAL PRIMARY KEY,
                          book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
                          title VARCHAR(255) NOT NULL,
                          url VARCHAR(255) UNIQUE NOT NULL,
                          content TEXT,
                          next_chapter_url VARCHAR(255),
                          prev_chapter_url VARCHAR(255),
                          chapter_order INTEGER,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          UNIQUE (book_id, chapter_order)
);



create table users
(
    id SERIAL PRIMARY KEY,
    username        varchar(50)  not null,
    email           varchar(100) not null
        unique,
    password        varchar(255) not null,
    token_fcm       text,
    created_at      timestamp    default CURRENT_TIMESTAMP,
    phone_number    varchar,
    click_send_name varchar      default ''::character varying,
    click_send_key  varchar      default ''::character varying,
    updated_at      timestamp    default CURRENT_TIMESTAMP,
    alert_phone     varchar(20)  default '114'::character varying,
    is_verified     boolean      default false,
    avatar_url      varchar(255) default 'default-avatar.png'::character varying
);

alter table users
    owner to postgres;



-- Bảng User_Reading_Progress (Tiến độ đọc của người dùng)
CREATE TABLE user_reading_progress (
                                       id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                                       book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
                                       chapter_id INTEGER REFERENCES chapters(chapter_id) ON DELETE SET NULL,
                                       last_position INTEGER DEFAULT 0,
                                       last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                       completion_percentage DECIMAL(5,2) DEFAULT 0,
                                       PRIMARY KEY (id, book_id)
);

-- Bảng Bookmarks (Đánh dấu trang)
CREATE TABLE bookmarks (
                           bookmark_id SERIAL PRIMARY KEY,
                           id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                           book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
                           chapter_id INTEGER REFERENCES chapters(chapter_id) ON DELETE CASCADE,
                           position INTEGER DEFAULT 0,
                           note TEXT,
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng User_Book_Favorites (Sách yêu thích của người dùng)
CREATE TABLE user_favorites (
                                id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                                book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
                                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                PRIMARY KEY (id, book_id)
);

create table server_log
(
    id            serial
        primary key,
    status_code   integer,
    method        varchar(10),
    url           text,
    headers       jsonb,
    request_body  jsonb,
    response_body jsonb,
    level         varchar(10),
    message       text,
    timestamp     timestamp default now()
);

alter table server_log
    owner to postgres;



-- Tạo indexes để tối ưu việc truy vấn
CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_books_author ON books(author_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_chapters_book ON chapters(book_id);
CREATE INDEX idx_chapters_order ON chapters(book_id, chapter_order);
CREATE INDEX idx_reading_progress_user ON user_reading_progress(id);
CREATE INDEX idx_reading_progress_book ON user_reading_progress(book_id);
CREATE INDEX idx_bookmarks_user ON bookmarks(id);
CREATE INDEX idx_favorites_user ON user_favorites(id);