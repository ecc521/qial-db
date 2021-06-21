#Use volumes
docker run --mount source=qial-db-data,target=/qial-db/public/data  --mount source=qial-db-cache,target=/qial-db/public/cache -dp 8000:8000 qial-db
