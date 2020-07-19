FROM node:14-alpine
WORKDIR /us/app/
COPY . ./
RUN yarn
CMD yarn start