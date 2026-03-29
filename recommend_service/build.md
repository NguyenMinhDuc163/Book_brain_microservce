# Build + push image mới
docker login
docker build -t nguyenduc1603/book-brain-ai-service:tagname -t nguyenduc1603/book-brain-ai-service:latest ./recommend_service
docker push nguyenduc1603/book-brain-ai-service:tagname
docker push nguyenduc1603/book-brain-ai-service:latest

# Server/client chỉ cần kéo và chạy
docker compose -f recommend_service/docker-compose.yml pull
docker compose -f recommend_service/docker-compose.yml up -d --force-recreate
