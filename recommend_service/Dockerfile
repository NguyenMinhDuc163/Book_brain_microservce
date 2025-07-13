# Sử dụng image Python chính thức làm base
FROM python:3.9-slim

# Cài đặt các dependencies hệ thống cần thiết
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Đặt thư mục làm việc trong container
WORKDIR /app

# Nâng cấp pip
RUN pip install --upgrade pip

# Sao chép file requirements trước để tận dụng cache của Docker
COPY requirements.txt .

# Cài đặt các dependencies Python
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép toàn bộ mã nguồn của dự án vào container
COPY . .

# Đặt biến môi trường
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1

# Mở cổng mà ứng dụng sẽ chạy
EXPOSE 5000

# Sử dụng gunicorn thay vì flask run cho production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]