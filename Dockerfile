FROM python:slim-buster

RUN apt-get update
RUN apt-get upgrade -y

RUN apt-get install -y gcc g++ #Used to build cloud-volume dependencies.
RUN apt-get install -y libz-dev #Used to build indexed-gzip.
RUN apt-get install -y build-essential #Needed for some python deps.

RUN apt-get install -y zip

#Install latest NodeJS using n
RUN apt-get install -y curl
RUN curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o n
RUN bash n latest

WORKDIR /qial-db
COPY . .

RUN --mount=type=cache,target=/root/.cache/pip pip install numpy setuptools wheel cython #This needs to run first - needed for some other dependencies.
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt
RUN npm install --only=prod

CMD node server.js

EXPOSE 8080
