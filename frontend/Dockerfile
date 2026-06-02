FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

ENV NODE_OPTIONS="--max-old-space-size=2048"
COPY . .

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
