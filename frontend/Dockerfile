# ---- 构建阶段 ----
# 使用 Node.js 18-alpine 作为基础镜像进行构建
FROM node:18-alpine AS build

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json (或 yarn.lock)
COPY package*.json ./

# 安装项目依赖
# 如果使用 yarn, 请替换为 RUN yarn install
RUN npm install

# 复制所有前端代码到工作目录
COPY . .

# 执行构建命令 (例如 Vite, Create React App)
RUN npm run build

# ---- 生产阶段 ----
# 使用 Nginx alpine 镜像作为最终运行环境
FROM nginx:alpine

# 从构建阶段复制构建好的静态文件到 Nginx 的 HTML 目录
COPY --from=build /app/dist /usr/share/nginx/html

# 复制自定义的 Nginx 配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露容器的80端口 (Nginx 默认监听端口)
EXPOSE 80

# Nginx 启动命令，在前台运行以保持容器存活
CMD ["nginx", "-g", "daemon off;"]
