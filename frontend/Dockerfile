# 构建阶段
FROM node:18-alpine as build

WORKDIR /app

# 复制package.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制所有文件
COPY . .

# 确保目录存在
RUN mkdir -p node_modules/.vite

# 构建应用
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 复制nginx配置
COPY default.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制构建结果
COPY --from=build /app/build /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]
