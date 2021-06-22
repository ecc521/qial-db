#Use bind mounts.

#TODO: Also bind packaged code and server. Can't bind node_modules (sharp has binaries), but can bind everything else.

docker run \
	--mount source="$(pwd)/public/data",target=/qial-db/public/data,type=bind  \
	--mount source="$(pwd)/public/cache",target=/qial-db/public/cache,type=bind \
	-dp 8000:8000 qial-db
