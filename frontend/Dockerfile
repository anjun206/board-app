# FROM node:20-alpine
FROM node:20-bookworm-slim

WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci || npm install

# 초기 빌드용 복사 (볼륨 마운트로 런타임에 덮임)
COPY . .

EXPOSE 5173
CMD ["npm","run","dev","--","--host","0.0.0.0","--port","5173"]
