from flask import Flask, g, request
from flask_cors import CORS
import time
from functools import wraps
import jwt

from config import JWT_SECRET, RECOMMENDATION_CONFIG
from utils.response_utils import standardize_response
from services.db_service import fetch_user_data, fetch_book_data, get_book_details
from models.recommendation import BookRecommender

app = Flask(__name__)
CORS(app)

_recommender_cache = {
    'loaded_at': 0,
    'readings_df': None,
    'reviews_df': None,
    'favorites_df': None,
    'books_df': None,
    'recommender': None
}


def require_auth(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        authorization = (request.headers.get('Authorization') or '').strip()
        parts = authorization.split(None, 1)

        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return {
                'code': 401, 'data': [], 'status': 'error',
                'message': 'Unauthorized', 'error': ''
            }, 401

        token = parts[1].strip()
        if not token or token.lower() in ('null', 'undefined'):
            return {
                'code': 401, 'data': [], 'status': 'error',
                'message': 'Unauthorized', 'error': ''
            }, 401

        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            user_id = decoded.get('userId')
            if not isinstance(user_id, int) or user_id <= 0:
                raise jwt.InvalidTokenError('Missing user identity')
            g.auth_user_id = user_id
        except jwt.PyJWTError:
            return {
                'code': 401, 'data': [], 'status': 'error',
                'message': 'Unauthorized', 'error': ''
            }, 401

        return handler(*args, **kwargs)
    return wrapped


def _get_cached_recommender():
    ttl_seconds = RECOMMENDATION_CONFIG['cache_ttl_seconds']
    now = time.time()

    if _recommender_cache['recommender'] is not None and (now - _recommender_cache['loaded_at']) < ttl_seconds:
        return (
            _recommender_cache['readings_df'],
            _recommender_cache['reviews_df'],
            _recommender_cache['favorites_df'],
            _recommender_cache['books_df'],
            _recommender_cache['recommender']
        )

    readings_df, reviews_df, favorites_df = fetch_user_data()
    books_df = fetch_book_data()
    recommender = BookRecommender(readings_df, reviews_df, favorites_df, books_df)

    _recommender_cache['loaded_at'] = now
    _recommender_cache['readings_df'] = readings_df
    _recommender_cache['reviews_df'] = reviews_df
    _recommender_cache['favorites_df'] = favorites_df
    _recommender_cache['books_df'] = books_df
    _recommender_cache['recommender'] = recommender

    return readings_df, reviews_df, favorites_df, books_df, recommender


@app.route('/')
def index():
    return standardize_response(
        data=[{"status": "API is running"}],
        message="Book Brain AI API is running",
        status_code=200
    )

@app.route('/api/v1/recommendations', methods=['GET'])
@require_auth
def get_recommendations():
    """API endpoint để lấy đề xuất sách cho người dùng"""
    # Ownership always comes from the verified token. The legacy query value is
    # accepted but deliberately ignored for Flutter backward compatibility.
    user_id = g.auth_user_id
    limit = request.args.get('limit', default=RECOMMENDATION_CONFIG['default_limit'], type=int)
    limit = min(max(limit or RECOMMENDATION_CONFIG['default_limit'], 1), 100)

    try:
        # Lấy dữ liệu cần thiết từ cache TTL
        readings_df, reviews_df, favorites_df, books_df, recommender = _get_cached_recommender()

        # Kiểm tra người dùng tồn tại
        if user_id not in readings_df['user_id'].values and user_id not in reviews_df['user_id'].values:
            # Nếu không có dữ liệu về người dùng, trả về sách phổ biến
            recommendations = recommender.get_popular_books(limit=limit)
        else:
            # Lấy đề xuất sách
            recommendations = recommender.hybrid_recommendations(user_id, top_n=limit)

        # Lấy thông tin chi tiết về sách
        book_ids = [rec['book_id'] for rec in recommendations]
        book_details = get_book_details(book_ids)

        # Kết hợp điểm đề xuất với thông tin chi tiết
        detail_map = {detail['book_id']: detail for detail in book_details}
        for rec in recommendations:
            detail = detail_map.get(rec['book_id'])
            if detail:
                rec.update(detail)

        return {
            "code": 200,
            "data": recommendations,
            "status": "success",
            "message": "Danh sách sách hot đã được truy xuất thành công.",
            "error": ""
        }, 200

    except Exception as e:
        return {
            "code": 500,
            "data": [],
            "status": "error",
            "message": "Lỗi khi lấy gợi ý sách",
            "error": ""
        }, 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
