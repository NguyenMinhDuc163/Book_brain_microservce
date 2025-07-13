import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from config import RECOMMENDATION_CONFIG, INTERACTION_WEIGHTS
from decimal import Decimal


def convert_to_float(value):
    """Chuyển đổi giá trị sang float một cách an toàn"""
    if isinstance(value, (np.int64, np.float64)):
        return float(value)
    elif isinstance(value, Decimal):
        return float(value)
    return value


class BookRecommender:
    """
    Lớp xử lý việc gợi ý sách cho người dùng
    """

    def __init__(self, readings_df, reviews_df, favorites_df, books_df):
        """
        Khởi tạo hệ thống gợi ý với dữ liệu cần thiết

        Args:
            readings_df: DataFrame lịch sử đọc của người dùng
            reviews_df: DataFrame đánh giá sách của người dùng
            favorites_df: DataFrame sách yêu thích của người dùng
            books_df: DataFrame thông tin về sách
        """
        self.readings_df = readings_df
        self.reviews_df = reviews_df
        self.favorites_df = favorites_df
        self.books_df = books_df

    def create_user_profile(self, user_id):
        """
        Tạo profile người dùng từ lịch sử đọc, đánh giá và yêu thích

        Args:
            user_id: ID người dùng

        Returns:
            dict: Thông tin tương tác sách của người dùng
        """
        # Lọc dữ liệu cho người dùng cụ thể
        user_readings = self.readings_df[self.readings_df['user_id'] == user_id]
        user_reviews = self.reviews_df[self.reviews_df['user_id'] == user_id]
        user_favorites = self.favorites_df[self.favorites_df['user_id'] == user_id]

        # Tổng hợp dữ liệu
        book_interactions = {}

        # Xử lý lịch sử đọc
        status_score = INTERACTION_WEIGHTS['reading_status']

        for _, row in user_readings.iterrows():
            book_id = row['book_id']
            if book_id not in book_interactions:
                book_interactions[book_id] = {
                    'category_id': row['category_id'],
                    'author_id': row['author_id'],
                    'interaction_score': 0
                }

            # Tính điểm tương tác
            status = row['reading_status']
            completion = convert_to_float(row['completion_rate']) if row['completion_rate'] else 0
            times_read = convert_to_float(row['times_read']) if row['times_read'] else 1

            interaction_score = status_score.get(status, 0) * (completion / 10) * times_read
            book_interactions[book_id]['interaction_score'] += interaction_score

        # Xử lý đánh giá
        rating_multiplier = INTERACTION_WEIGHTS['rating_multiplier']

        for _, row in user_reviews.iterrows():
            book_id = row['book_id']
            if book_id not in book_interactions:
                book_interactions[book_id] = {
                    'category_id': None,
                    'author_id': None,
                    'interaction_score': 0
                }

            # Đánh giá cao (4-5) có trọng số nhiều hơn
            rating = convert_to_float(row['rating'])
            rating_score = (rating / 5) * rating_multiplier
            book_interactions[book_id]['interaction_score'] += rating_score

        # Xử lý sách yêu thích
        favorite_score = INTERACTION_WEIGHTS['favorite_score']

        for _, row in user_favorites.iterrows():
            book_id = row['book_id']
            if book_id not in book_interactions:
                book_interactions[book_id] = {
                    'category_id': None,
                    'author_id': None,
                    'interaction_score': 0
                }

            # Sách yêu thích có trọng số cao
            book_interactions[book_id]['interaction_score'] += favorite_score

        return book_interactions

    def content_based_recommendations(self, user_profile, top_n=10):
        """
        Đề xuất sách dựa trên nội dung (thể loại và tác giả)

        Args:
            user_profile: Thông tin tương tác sách của người dùng
            top_n: Số lượng sách đề xuất

        Returns:
            list: Danh sách sách đề xuất
        """
        if not user_profile:
            return []

        # Tính điểm ưa thích theo thể loại và tác giả
        category_preferences = {}
        author_preferences = {}

        for book_id, data in user_profile.items():
            category_id = data['category_id']
            author_id = data['author_id']
            score = convert_to_float(data['interaction_score'])

            if category_id:
                category_preferences[category_id] = category_preferences.get(category_id, 0) + score

            if author_id:
                author_preferences[author_id] = author_preferences.get(author_id, 0) + score

        # Chuẩn hóa điểm ưa thích
        max_category_score = max(category_preferences.values()) if category_preferences else 1
        max_author_score = max(author_preferences.values()) if author_preferences else 1

        for category_id in category_preferences:
            category_preferences[category_id] /= max_category_score

        for author_id in author_preferences:
            author_preferences[author_id] /= max_author_score

        # Lấy các tham số từ cấu hình
        content_category_weight = RECOMMENDATION_CONFIG['content_category_weight']
        content_author_weight = RECOMMENDATION_CONFIG['content_author_weight']
        content_score_weight = RECOMMENDATION_CONFIG['content_score_weight']
        popularity_score_weight = RECOMMENDATION_CONFIG['popularity_score_weight']

        # Tính điểm đề xuất cho mỗi sách
        recommendations = []

        # Lọc ra sách người dùng chưa tương tác
        interacted_books = set(user_profile.keys())
        new_books = self.books_df[~self.books_df['book_id'].isin(interacted_books)]

        for _, book in new_books.iterrows():
            book_id = book['book_id']
            category_id = book['category_id']
            author_id = book['author_id']

            # Tính điểm nội dung dựa trên thể loại và tác giả
            content_score = 0

            # Thể loại phù hợp
            if category_id in category_preferences:
                content_score += category_preferences[category_id] * content_category_weight

            # Tác giả phù hợp
            if author_id in author_preferences:
                content_score += author_preferences[author_id] * content_author_weight

            # Xét thêm về độ phổ biến và đánh giá
            popularity_score = 0

            # Điểm đánh giá trung bình
            avg_rating = convert_to_float(book['avg_rating']) if pd.notna(book['avg_rating']) else 0
            popularity_score += (avg_rating / 5) * 0.3

            # Số lượng đánh giá
            review_count = convert_to_float(book['review_count']) if pd.notna(book['review_count']) else 0
            norm_reviews = min(review_count / 100, 1)  # Chuẩn hóa, tối đa 100 đánh giá
            popularity_score += norm_reviews * 0.2

            # Số lượt xem
            views = convert_to_float(book['views']) if pd.notna(book['views']) else 0
            norm_views = min(views / 1000, 1)  # Chuẩn hóa, tối đa 1000 lượt xem
            popularity_score += norm_views * 0.1

            # Kết hợp điểm nội dung và độ phổ biến
            final_score = (content_score * content_score_weight) + (popularity_score * popularity_score_weight)

            recommendations.append({
                'book_id': int(book_id),
                'title': book['title'],
                'score': float(final_score),
                'category_id': int(category_id) if pd.notna(category_id) else None,
                'author_id': int(author_id) if pd.notna(author_id) else None,
                'content_score': float(content_score),
                'popularity_score': float(popularity_score)
            })

        # Sắp xếp theo điểm và lấy top_n
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations[:top_n]

    def collaborative_recommendations(self, user_id, top_n=10):
        """
        Đề xuất sách dựa trên lọc cộng tác (người dùng tương tự)

        Args:
            user_id: ID người dùng
            top_n: Số lượng sách đề xuất

        Returns:
            list: Danh sách sách đề xuất
        """
        # Tạo ma trận người dùng-sách từ đánh giá và lịch sử đọc
        user_book_interactions = self.readings_df.copy()

        # Chuyển đổi trạng thái đọc thành điểm
        status_mapping = {
            'completed': 4.0,
            'reading': 3.0,
            'plan_to_read': 2.0,
            'dropped': 1.0
        }
        user_book_interactions['interaction_score'] = user_book_interactions['reading_status'].map(status_mapping)

        # Kết hợp với đánh giá sao (nếu có)
        for _, review in self.reviews_df.iterrows():
            user = review['user_id']
            book = review['book_id']
            rating = convert_to_float(review['rating'])

            # Cập nhật hoặc thêm mới
            mask = (user_book_interactions['user_id'] == user) & (user_book_interactions['book_id'] == book)
            if mask.any():
                user_book_interactions.loc[mask, 'interaction_score'] = rating
            else:
                new_row = pd.DataFrame({
                    'user_id': [user],
                    'book_id': [book],
                    'interaction_score': [rating]
                })
                user_book_interactions = pd.concat([user_book_interactions, new_row])

        # Tạo ma trận người dùng-sách
        user_book_matrix = user_book_interactions.pivot(
            index='user_id',
            columns='book_id',
            values='interaction_score'
        ).fillna(0)

        # Tính độ tương đồng giữa người dùng
        user_similarity = cosine_similarity(user_book_matrix)
        user_similarity_df = pd.DataFrame(
            user_similarity,
            index=user_book_matrix.index,
            columns=user_book_matrix.index
        )

        # Lấy người dùng tương tự
        if user_id not in user_similarity_df.index:
            return []

        similar_users = user_similarity_df[user_id].sort_values(ascending=False)[1:11]  # 10 người tương tự nhất

        # Lấy sách người dùng đã đọc
        user_books = set(user_book_matrix.loc[user_id][user_book_matrix.loc[user_id] > 0].index)

        # Tìm sách từ người dùng tương tự mà người dùng hiện tại chưa đọc
        recommendations = {}

        for similar_user, similarity in similar_users.items():
            if similarity <= 0:  # Bỏ qua người dùng không tương tự
                continue

            similar_user_books = user_book_matrix.loc[similar_user]
            similar_user_books = similar_user_books[similar_user_books > 0]

            for book, score in similar_user_books.items():
                if book not in user_books:
                    if book not in recommendations:
                        recommendations[book] = 0
                    # Trọng số bằng độ tương tự * điểm tương tác
                    recommendations[book] += convert_to_float(similarity) * convert_to_float(score)

        # Chuyển đổi sang danh sách và sắp xếp
        recommendation_list = []

        for book_id, score in recommendations.items():
            book_info = self.books_df[self.books_df['book_id'] == book_id]
            if len(book_info) > 0:
                recommendation_list.append({
                    'book_id': int(book_id),
                    'title': book_info['title'].values[0],
                    'score': float(score),
                    'category_id': int(book_info['category_id'].values[0]) if pd.notna(
                        book_info['category_id'].values[0]) else None,
                    'author_id': int(book_info['author_id'].values[0]) if pd.notna(
                        book_info['author_id'].values[0]) else None
                })

        recommendation_list.sort(key=lambda x: x['score'], reverse=True)
        return recommendation_list[:top_n]

    def hybrid_recommendations(self, user_id, top_n=10):
        """
        Kết hợp đề xuất dựa trên nội dung và lọc cộng tác

        Args:
            user_id: ID người dùng
            top_n: Số lượng sách đề xuất

        Returns:
            list: Danh sách sách đề xuất
        """
        # Lấy các tham số từ cấu hình
        hybrid_content_weight = RECOMMENDATION_CONFIG['hybrid_content_weight']
        hybrid_collab_weight = RECOMMENDATION_CONFIG['hybrid_collab_weight']

        # Tạo profile người dùng
        user_profile = self.create_user_profile(user_id)

        # Lấy đề xuất dựa trên nội dung
        content_recs = self.content_based_recommendations(user_profile, top_n=top_n)

        # Lấy đề xuất dựa trên lọc cộng tác
        collab_recs = self.collaborative_recommendations(user_id, top_n=top_n)

        # Kết hợp kết quả
        hybrid_recs = {}

        # Trộn đề xuất dựa trên nội dung
        for rec in content_recs:
            book_id = rec['book_id']
            if book_id not in hybrid_recs:
                hybrid_recs[book_id] = {
                    'book_id': book_id,
                    'title': rec['title'],
                    'score': 0,
                    'category_id': rec['category_id'],
                    'author_id': rec['author_id']
                }
            hybrid_recs[book_id]['score'] += convert_to_float(rec['score']) * hybrid_content_weight

        # Trộn đề xuất dựa trên lọc cộng tác
        for rec in collab_recs:
            book_id = rec['book_id']
            if book_id not in hybrid_recs:
                hybrid_recs[book_id] = {
                    'book_id': book_id,
                    'title': rec['title'],
                    'score': 0,
                    'category_id': rec['category_id'],
                    'author_id': rec['author_id']
                }
            hybrid_recs[book_id]['score'] += convert_to_float(rec['score']) * hybrid_collab_weight

        # Chuyển đổi thành danh sách và sắp xếp
        result = list(hybrid_recs.values())
        result.sort(key=lambda x: x['score'], reverse=True)

        return result[:top_n]

    def get_popular_books(self, limit=10):
        """
        Lấy sách phổ biến cho người dùng mới

        Args:
            limit: Số lượng sách trả về

        Returns:
            list: Danh sách sách phổ biến
        """
        popular_books = self.books_df.sort_values('ranking_score', ascending=False).head(limit)
        recommendations = []

        for _, book in popular_books.iterrows():
            recommendations.append({
                'book_id': int(book['book_id']),
                'title': book['title'],
                'score': float(convert_to_float(book['ranking_score'])) if pd.notna(book['ranking_score']) else 0,
                'category_id': int(book['category_id']) if pd.notna(book['category_id']) else None,
                'author_id': int(book['author_id']) if pd.notna(book['author_id']) else None
            })

        return recommendations