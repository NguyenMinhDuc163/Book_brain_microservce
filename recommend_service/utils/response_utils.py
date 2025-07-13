from flask import jsonify


def standardize_response(data=None, message="", status_code=200, error=""):
    """
    Chuẩn hóa định dạng response theo yêu cầu

    Args:
        data: Dữ liệu trả về, có thể là object hoặc list
        message: Thông báo trả về cho người dùng
        status_code: Mã HTTP status
        error: Thông báo lỗi (nếu có)

    Returns:
        Tuple (response_json, status_code)
    """
    if data is None:
        data = []
    elif not isinstance(data, list):
        data = [data]

    return jsonify({
        "code": status_code,
        "data": data,
        "status": "success" if status_code < 400 else "error",
        "message": message,
        "error": error
    }), status_code