import os

# Cấu hình cơ sở dữ liệu và các tham số ứng dụng
DB_CONFIG = {
    'dbname': os.environ['DB_NAME'],
    'user': os.environ['DB_USER'],
    'password': os.environ['DB_PASSWORD'],
    'host': os.environ['DB_HOST'],
    'port': os.environ['DB_PORT']
}


# Tham số cài đặt cho hệ thống gợi ý
RECOMMENDATION_CONFIG = {
    'content_category_weight': 0.6,    # Trọng số thể loại trong content-based
    'content_author_weight': 0.4,      # Trọng số tác giả trong content-based
    'content_score_weight': 0.7,       # Trọng số chung cho content-based
    'popularity_score_weight': 0.3,    # Trọng số chung cho popularity
    'hybrid_content_weight': 0.6,      # Trọng số cho content-based trong hybrid
    'hybrid_collab_weight': 0.4,       # Trọng số cho collaborative trong hybrid
    'default_limit': 10,               # Số lượng sách gợi ý mặc định
    'cache_ttl_seconds': int(os.getenv('RECOMMENDATION_CACHE_TTL', '120'))
}

# Trọng số cho các loại tương tác
INTERACTION_WEIGHTS = {
    'reading_status': {
        'completed': 5,
        'reading': 3,
        'plan_to_read': 1,
        'dropped': 0
    },
    'rating_multiplier': 3,    # Nhân với đánh giá (1-5)
    'favorite_score': 5        # Điểm cộng cho sách yêu thích
}