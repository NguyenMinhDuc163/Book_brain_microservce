docker login
docker build -t nguyenduc1603/book_brain:tagname -t nguyenduc1603/book_brain:latest ./book_brain_service

# 3) Push lên Docker Hub
docker push nguyenduc1603/book_brain:tagname
docker push nguyenduc1603/book_brain:latest

# 4) Kéo bản mới và chạy lại service
docker compose -f book_brain_service/docker-compose.yml pull app
docker compose -f book_brain_service/docker-compose.yml up -d --force-recreate app