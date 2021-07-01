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

CMD node server.js

EXPOSE 8000
