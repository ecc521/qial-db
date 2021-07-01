FROM node:current-buster

RUN apt-get update
RUN apt-get upgrade -y

RUN apt-get install -y zip
RUN apt-get install -y python3-pip

WORKDIR /qial-db
COPY . .

RUN pip3 install -r requirements.txt
RUN npm install

CMD node server.js

EXPOSE 8000
