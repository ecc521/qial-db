FROM python:slim-buster as python-nodejs

RUN apt update
RUN apt upgrade -y

#Install latest NodeJS using n
RUN apt install -y curl
RUN curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o n
RUN bash n latest




FROM python-nodejs as with-build-dependencies
RUN apt install -y zip #Used by server for zip downloads.
RUN apt install -y build-essential #Needed to build indexed-gzip & cloud-volume

RUN pip install numpy #Needed to build indexed-gzip, probably more.

RUN apt install -y libz-dev #Needed to build indexed-gzip
RUN pip install Cython #Needed to build indexed-gzip





#TODO: Python installation (especially cloud-volume) is the big bottleneck.
#We need to split that off as well.
FROM with-build-dependencies
WORKDIR /qial-db
COPY . .

#Install npm modules
RUN npm install --only=prod

#TODO: To pip cache, put the following flag between "RUN" and "pip"
#--mount=type=cache,target=/root/.cache/pip
#We need to figure out how to make this flag not crash on GitLab, so it can stay.

RUN pip install -r requirements.txt

CMD node server.js

EXPOSE 8080
