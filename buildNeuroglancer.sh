#Install and Build Neuroglancer.
#The latest known working version is 6cd3f0a.
cd public
git clone https://github.com/google/neuroglancer.git
cd neuroglancer
git reset --hard 6cd3f0a
npm install
npm run build-min
cd ../../
