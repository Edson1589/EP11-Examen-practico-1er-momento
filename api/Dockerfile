FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node src ./src

USER node
EXPOSE 3000

CMD ["node", "src/server.js"]
