FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["npm", "start"]
