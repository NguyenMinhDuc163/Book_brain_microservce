-- Tắt kiểm tra ràng buộc khóa ngoại tạm thời
SET CONSTRAINTS ALL DEFERRED;

-- Xóa dữ liệu từ tất cả các bảng
TRUNCATE TABLE user_favorites, bookmarks, user_reading_progress,
    chapters, books, authors, categories, users
    RESTART IDENTITY CASCADE;

-- Bật lại kiểm tra ràng buộc khóa ngoại
SET CONSTRAINTS ALL IMMEDIATE;
