FROM node:16.3.0-stretch

RUN apt-get update
RUN apt-get upgrade -y

RUN apt-get install -y zip
RUN apt-get install -y python3-pip

WORKDIR /

RUN git clone https://github.com/ecc521/qial-db.git

WORKDIR /qial-db

RUN npm install

RUN pip3 install -r requirements.txt

#Install and Build Neuroglancer.
#The latest known working version is 6cd3f0a.

RUN git clone https://github.com/google/neuroglancer.git
RUN cd neuroglancer
RUN git reset --hard 6cd3f0a
RUN npm install
RUN npm run build-min
RUN cd ../

#End Neuroglancer Build.

CMD node server.js

EXPOSE 8000
