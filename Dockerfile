FROM node:current-buster

RUN apt-get update
RUN apt-get upgrade -y

RUN apt-get install -y zip
RUN apt-get install -y python3-pip

WORKDIR /qial-db
COPY . .

RUN pip3 install -r requirements.txt
RUN npm install

RUN sh buildNeuroglancer.sh

#Keep only the Neuroglancer build files - remove everything else. Reduces image size a bit.
#One thing to note - this effectively hides Neuroglancer from the vulnerability scanner (Neuroglancer would cause it to fail otherwise though).
#Any issues would need to be client side, so there isn't an easy target - RCE would be needed.
#If we can isolate login cookies from the self-hosted neuroglancer, everything is safe.
#Can we check the path that is sending the request? iFrames seem risky. Maybe revert to appspot demo, but that's broken at times. 

RUN mv neuroglancer/dist ndisttemp
RUN rm -rf neuroglancer
RUN mkdir neuroglancer
RUN mv ndisttemp neuroglancer/dist

CMD node server.js

EXPOSE 8000
