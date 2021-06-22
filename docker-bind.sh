#Use bind mounts.
docker run \
	--mount source="$(pwd)/data",target=/qial-db/data,type=bind  \
	--mount source="$(pwd)/cache",target=/qial-db/cache,type=bind \
	-dp 8000:8000 qial-db
