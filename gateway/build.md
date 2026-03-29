docker login

docker build \
-t nguyenduc1603/book-brain-gateway:tagname \
-t nguyenduc1603/book-brain-gateway:latest \
./gateway

docker push nguyenduc1603/book-brain-gateway:tagname
docker push nguyenduc1603/book-brain-gateway:latest
