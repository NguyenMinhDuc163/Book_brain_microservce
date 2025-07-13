import pandas as pd
import numpy as np
import psycopg2
import psycopg2.extras
from config import DB_CONFIG


def get_db_connection():
    """Tạo kết nối tới PostgreSQL DB"""
    conn = psycopg2.connect(**DB_CONFIG)
    return conn


def fetch_user_data():
    """
    Lấy dữ liệu người dùng và lịch sử đọc từ cơ sở dữ liệu

    Returns:
        tuple: (readings_df, reviews_df, favorites_df)
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    # Lấy dữ liệu đọc của người dùng
    query = """
    SELECT 
        rh.user_id, 
        rh.book_id, 
        rh.reading_status, 
        rh.completion_rate, 
        rh.times_read,
        b.category_id,
        b.rating,
        b.author_id
    FROM reading_history rh
    JOIN books b ON rh.book_id = b.book_id
    """
    cursor.execute(query)
    reading_data = cursor.fetchall()

    # Lấy đánh giá của người dùng
    query = """
    SELECT 
        user_id, 
        book_id, 
        rating
    FROM book_reviews
    """
    cursor.execute(query)
    review_data = cursor.fetchall()

    # Lấy sách yêu thích
    query = """
    SELECT 
        id as user_id, 
        book_id
    FROM user_favorites
    """
    cursor.execute(query)
    favorite_data = cursor.fetchall()

    cursor.close()
    conn.close()

    # Chuyển thành pandas DataFrames
    readings_df = pd.DataFrame(reading_data, columns=['user_id', 'book_id', 'reading_status',
                                                      'completion_rate', 'times_read',
                                                      'category_id', 'rating', 'author_id'])
    reviews_df = pd.DataFrame(review_data, columns=['user_id', 'book_id', 'rating'])
    favorites_df = pd.DataFrame(favorite_data, columns=['user_id', 'book_id'])

    return readings_df, reviews_df, favorites_df


def fetch_book_data():
    """
    Lấy thông tin chi tiết về sách từ cơ sở dữ liệu

    Returns:
        DataFrame: Dữ liệu sách
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    query = """
    SELECT 
        b.book_id, 
        b.title, 
        b.category_id, 
        b.author_id,
        b.status,
        b.rating,
        b.views,
        br.avg_rating,
        br.review_count,
        br.favorite_count,
        br.ranking_score
    FROM books b
    LEFT JOIN book_rankings br ON b.book_id = br.book_id
    """
    cursor.execute(query)
    book_data = cursor.fetchall()

    cursor.close()
    conn.close()

    books_df = pd.DataFrame(book_data, columns=['book_id', 'title', 'category_id', 'author_id',
                                                'status', 'rating', 'views', 'avg_rating',
                                                'review_count', 'favorite_count', 'ranking_score'])
    return books_df


def get_book_details(book_ids):
    """
    Lấy thông tin chi tiết về sách từ ID

    Args:
        book_ids: Danh sách ID sách cần lấy thông tin

    Returns:
        list: Danh sách thông tin chi tiết sách
    """
    if not book_ids:
        return []

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    placeholders = ','.join(['%s'] * len(book_ids))
    query = f"""
    SELECT 
        b.book_id, 
        b.title,
        CONCAT('https://gacsach.top/', LOWER(REPLACE(b.title, ' ', '-')), '_', LOWER(a.name), '.full') as url,
        b.image_url,
        b.excerpt,
        b.views,
        b.status,
        b.rating,
        b.author_id,
        a.name as author_name,
        b.category_id,
        c.name as category_name
    FROM books b
    LEFT JOIN authors a ON b.author_id = a.author_id
    LEFT JOIN categories c ON b.category_id = c.category_id
    WHERE b.book_id IN ({placeholders})
    """

    cursor.execute(query, book_ids)
    book_details = cursor.fetchall()

    cursor.close()
    conn.close()

    result = []
    for book in book_details:
        book_dict = dict(book)
        # Chuyển đổi các giá trị decimal sang float
        for key, value in book_dict.items():
            if isinstance(value, (np.int64, np.float64)):
                book_dict[key] = float(value)
            elif hasattr(value, 'to_eng_string'):  # Kiểm tra nếu là decimal.Decimal
                book_dict[key] = float(value)
        
        # Định dạng rating nếu có
        if 'rating' in book_dict and book_dict['rating'] is not None:
            book_dict['rating'] = f"{float(book_dict['rating']):.2f}"
        
        result.append(book_dict)

    return result