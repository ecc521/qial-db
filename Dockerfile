FROM node:16.3.0-stretch

RUN apt-get update
RUN apt-get upgrade -y

RUN apt-get install -y zip
RUN apt-get install -y python3-pip

WORKDIR /qial-db

COPY requirements.txt .
RUN pip3 install -r requirements.txt

COPY package.json .
RUN npm install

#Neuroglancer build files are copied here - we will build them outside of the container (to reduce size and avoid the need for cleanup).
COPY . /qial-db
CMD node public/server.js

EXPOSE 8000
