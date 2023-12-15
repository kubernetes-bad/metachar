FROM node:20

EXPOSE 3000

WORKDIR /app
COPY . /app
RUN npm i -g @nestjs/cli && npm install && npm run build

CMD npm run start:prod
