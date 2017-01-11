FROM node:7.4-alpine

ENV DEEPSTREAM_AUTH_ROLE=provider \
    DEEPSTREAM_AUTH_USERNAME=trade-service

RUN mkdir /usr/local/trade
WORKDIR /usr/local/trade
COPY . /usr/local/trade
RUN npm install

CMD [ "npm", "run", "start-prod"]