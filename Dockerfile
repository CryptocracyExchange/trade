FROM node:7.4-alpine

WORKDIR /usr/local/trade
COPY . /usr/local/trade
RUN npm install

ENV DEEPSTREAM_AUTH_ROLE=provider \
    DEEPSTREAM_AUTH_USERNAME=trade-service

# Define default command.
CMD [ "npm", "run", "start-prod"]

# Expose API webhook listener port.
# EXPOSE 8888