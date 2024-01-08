FROM node:20 AS builder

WORKDIR /app
COPY . /app
RUN npm install && npm run build

FROM node:20

WORKDIR /app
EXPOSE 8006
COPY --from=builder /app/build/ /app/
RUN npm install -g serve

CMD ["serve", "-s", "/app", "-p", "8006", "--no-clipboard"]
