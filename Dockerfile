FROM python:slim-buster

RUN apt-get update
RUN apt-get upgrade -y

RUN apt-get install -y zip

#Install latest NodeJS using n
RUN apt-get install -y curl
RUN curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o n
RUN bash n latest

WORKDIR /qial-db
COPY . .

RUN pip3 install -r requirements.txt
RUN npm install

CMD node server.js

EXPOSE 8080
