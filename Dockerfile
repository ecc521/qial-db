FROM python:slim-buster

RUN apt-get update
RUN apt-get upgrade -y

RUN apt-get install -y zip #Used by server for zip downloads.

#Install latest NodeJS using n
RUN apt-get install -y curl
RUN curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o n
RUN bash n latest

RUN apt-get install -y libz-dev #Used to build indexed-gzip.
RUN apt-get install -y build-essential #Needed to build some python dependencies (cloud-volume, indexed-gzip).

WORKDIR /qial-db
COPY . .

#Install npm modules
RUN npm install --only=prod

#TODO: To pip cache, put the following flag between "RUN" and "pip"
#--mount=type=cache,target=/root/.cache/pip
#We need to figure out how to make this flag not crash on GitLab, so it can stay.

RUN pip install numpy #This needs to run first - needed for some python dependency installs.
RUN pip install -r requirements.txt

CMD node server.js

EXPOSE 8080
