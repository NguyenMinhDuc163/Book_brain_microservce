from flask import Flask, request
from flask_cors import CORS
import pandas as pd

from config import RECOMMENDATION_CONFIG
from utils.response_utils import standardize_response
from services.db_service import fetch_user_data, fetch_book_data, get_book_details
from models.recommendation import BookRecommender

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return standardize_response(
        data=[{"status": "API is running"}],
        message="Book Brain AI API is running",
        status_code=200
    )

@app.route('/api/v1/recommendations', methods=['GET'])
def get_recommendations():
    """API endpoint để lấy đề xuất sách cho người dùng"""
    user_id = request.args.get('user_id', type=int)
    limit = request.args.get('limit', default=RECOMMENDATION_CONFIG['default_limit'], type=int)

    if not user_id:
        return {
            "code": 400,
            "data": [],
            "status": "error",
            "message": "Thiếu thông tin user_id",
            "error": "Missing user_id parameter"
        }

    try:
        # Lấy dữ liệu cần thiết
        readings_df, reviews_df, favorites_df = fetch_user_data()
        books_df = fetch_book_data()

        # Khởi tạo hệ thống gợi ý
        recommender = BookRecommender(readings_df, reviews_df, favorites_df, books_df)

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
        for rec in recommendations:
            for detail in book_details:
                if rec['book_id'] == detail['book_id']:
                    rec.update(detail)
                    break

        return {
            "code": 200,
            "data": recommendations,
            "status": "success",
            "message": "Danh sách sách hot đã được truy xuất thành công.",
            "error": ""
        }

    except Exception as e:
        return {
            "code": 500,
            "data": [],
            "status": "error",
            "message": "Lỗi khi lấy gợi ý sách",
            "error": str(e)
        }

if __name__ == '__main__':
    app.run(debug=True, port=5000)
