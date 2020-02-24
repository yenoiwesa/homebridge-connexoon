FROM node:alpine

WORKDIR /homebridge-connexoon

RUN apk add --update python3
RUN apk add make
RUN apk add g++

RUN npm install -g homebridge
COPY package.json .
RUN npm install
COPY . .

CMD [ "npm", "run", "start" ]