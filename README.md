# Qial-DB Setup:

## Building Development Copy
```
git clone https://github.com/ecc521/qial-db
cd qial-db
npm install

sh buildNeuroglancer.sh

node server.js
```

To build code changes, run ```npm run build```. The build tool will watch for code changes and rebuild as necessary.


## Building Docker Image (Assumes Docker installed)
```
#Clone the repository:
git clone https://github.com/ecc521/qial-db
cd qial-db
npm run docker-build

#You can run the docker image - using volumes or binding the data/cache directory is recommended (npm run docker-bind, or npm run docker-volume).
#Volumes can be setup using npm run docker-setup
```



Utility command to update thumbnails (run from the qial-db directory):
```
find ./cache/precomputed -maxdepth 1 -type d -execdir python3 "../../server/python/Precomputed/Utils/thumbnails.py" "{}"  "{}/x.webp" "{}/y.webp" "{}/z.webp"  ";"
```
