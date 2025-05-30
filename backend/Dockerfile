FROM node:18-alpine
RUN apk add --no-cache bind-tools whois tzdata openssl
ENV TZ=Asia/Shanghai
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p logs backups data scanner ssl-checker && chmod 777 logs backups data scanner ssl-checker
EXPOSE 3001
CMD ["node", "src/app.js"]
