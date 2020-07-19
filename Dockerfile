FROM node:14-alpine
WORKDIR /usr/app/
COPY . ./
RUN yarn
CMD yarn start