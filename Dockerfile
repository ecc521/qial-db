FROM python:buster

RUN apt-get update
RUN apt-get upgrade -y

RUN apt-get install -y zip

#TODO: Use a version manager to install latest (once it moves to 17+). https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

WORKDIR /qial-db
COPY . .

RUN pip3 install -r requirements.txt
RUN npm install

#Install and Build Neuroglancer.
#The latest known working version is 6cd3f0a.
RUN git clone https://github.com/google/neuroglancer.git

WORKDIR /qial-db/neuroglancer

RUN git reset --hard 6cd3f0a
RUN npm install
RUN npm run build-min

WORKDIR /qial-db

CMD node server.js

EXPOSE 8000
