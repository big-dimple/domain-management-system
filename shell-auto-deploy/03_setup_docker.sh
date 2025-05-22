#!/bin/bash

# 域名管理系统 - Docker配置脚本
# 此脚本负责创建docker-compose.yml和Dockerfile

# 彩色输出函数
print_green() {
    echo -e "\e[32m$1\e[0m" # 绿色输出
}

print_yellow() {
    echo -e "\e[33m$1\e[0m" # 黄色输出
}

print_red() {
    echo -e "\e[31m$1\e[0m" # 红色输出
}

print_blue() {
    echo -e "\e[34m$1\e[0m" # 蓝色输出
}

# 读取配置
# PROJECT_DIR, MONGO_USER, MONGO_PASSWORD 将从此文件加载
if [ -f /tmp/domain-management-system/config ]; then
    source /tmp/domain-management-system/config
else
    print_red "错误：找不到配置文件 /tmp/domain-management-system/config。"
    print_red "请确保已先运行初始化脚本 (02_initialize_project.sh)。"
    exit 1
fi

# 检查 PROJECT_DIR 是否已设置
if [ -z "$PROJECT_DIR" ]; then
    print_red "错误：项目目录 (PROJECT_DIR) 未在配置文件中设置。"
    exit 1
fi

# 显示脚本信息
print_blue "========================================"
print_blue "    域名管理系统 - Docker配置脚本"
print_blue "========================================"
print_yellow "此脚本将执行以下操作:"
echo "1. 创建 docker-compose.yml 文件"
echo "2. 创建前端 Dockerfile 和 Nginx 配置文件"
echo "3. 创建后端 Dockerfile 文件"

# 创建docker-compose.yml
print_green "创建 docker-compose.yml 文件..."
# 注意：这里的 EOF 是带引号的，所以内部的 ${MONGO_USER} 等变量不会在当前脚本中展开，
# 而是在 docker-compose up 时由 Docker Compose 从 .env 文件中读取。
cat > "$PROJECT_DIR/docker-compose.yml" << 'EOF'
version: '3.8' # Docker Compose 文件版本

services:
  # 前端服务 (Nginx + React 构建产物)
  frontend:
    build:
      context: ./frontend # Dockerfile 所在目录
      dockerfile: Dockerfile # Dockerfile 文件名
    ports:
      - "8080:80" # 将宿主机的8080端口映射到容器的80端口
    depends_on:
      - backend # 依赖后端服务先启动 (仅控制启动顺序，不保证后端完全可用)
    restart: unless-stopped # 除非手动停止，否则容器会自动重启
    networks:
      - domain-management-network # 加入自定义网络

  # 后端服务 (Node.js API)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001" # 将宿主机的3001端口映射到容器的3001端口
    env_file:
      - .env # 从项目根目录的 .env 文件加载环境变量
    depends_on:
      - mongodb # 依赖MongoDB服务
    restart: unless-stopped
    volumes:
      - ./backend/logs:/app/logs # 将宿主机的 backend/logs 目录映射到容器的 /app/logs，用于持久化日志
      - ./backend/backups:/app/backups # 将宿主机的 backend/backups 目录映射到容器的 /app/backups，用于持久化备份
    networks:
      - domain-management-network

  # MongoDB数据库服务
  mongodb:
    image: mongo:5.0 # 使用官方 MongoDB 5.0 镜像
    container_name: domain-management-mongodb # 自定义容器名称
    environment:
      # 从 .env 文件读取 MongoDB 的 root 用户名和密码
      # 这些变量由 Docker Compose 自动从项目根目录的 .env 文件注入
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_USER}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
    volumes:
      - mongo-data:/data/db # 使用命名数据卷 mongo-data 持久化数据库文件
    ports:
      - "27017:27017" # 将宿主机的27017端口映射到容器的27017端口
    restart: unless-stopped
    networks:
      - domain-management-network

# 数据卷定义
volumes:
  mongo-data: # 定义一个名为 mongo-data 的本地数据卷
    driver: local

# 网络定义
networks:
  domain-management-network: # 定义一个名为 domain-management-network 的桥接网络
    driver: bridge
EOF

# 创建前端Dockerfile
print_green "创建前端 Dockerfile (./frontend/Dockerfile)..."
cat > "$PROJECT_DIR/frontend/Dockerfile" << 'EOF'
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
EOF

# 创建Nginx配置
print_green "创建Nginx配置文件 (./frontend/nginx.conf)..."
cat > "$PROJECT_DIR/frontend/nginx.conf" << 'EOF'
server {
    listen 80; # Nginx 监听80端口
    server_name localhost; # 可根据需要修改为实际域名

    # 静态文件根目录 (对应 Dockerfile 中 COPY --from=build /app/dist ...)
    root /usr/share/nginx/html;
    index index.html; # 默认索引文件

    # 配置 gzip 压缩以优化传输效率
    gzip on;
    gzip_vary on;
    gzip_min_length 10240; # 超过10KB的文件才压缩
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;
    gzip_disable "MSIE [1-6]\."; # 禁用IE6的gzip

    # 缓存常见的静态资源 (图片, CSS, JS)
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 7d; # 缓存7天
        add_header Cache-Control "public, max-age=604800, immutable";
    }

    # 支持单页面应用 (SPA) 路由 (如 React Router)
    # 如果请求的文件或目录不存在，则返回 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 转发 API 请求到后端服务
    # 所有 /api/ 开头的请求都将被代理到后端
    location /api/ {
        # backend 是 docker-compose.yml 中定义的后端服务名
        # 3001 是后端服务在容器网络中监听的端口
        proxy_pass http://backend:3001/api/; 
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade'; # 支持 WebSocket (如果需要)
        proxy_set_header Host $host; # 传递原始 Host 头
        proxy_set_header X-Real-IP $remote_addr; # 传递真实客户端 IP
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade; # 对于升级的连接不使用缓存
    }
}
EOF

# 创建后端Dockerfile
print_green "创建后端 Dockerfile (./backend/Dockerfile)..."
cat > "$PROJECT_DIR/backend/Dockerfile" << 'EOF'
# 使用 Node.js 18-alpine 作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json (或 yarn.lock)
COPY package*.json ./

# 安装生产环境依赖
# 如果使用 yarn, 请替换为 RUN yarn install --production
RUN npm install --production

# 复制所有后端源代码到工作目录
# 使用 .dockerignore 文件来排除不需要复制的文件 (如 node_modules, .git, etc.)
COPY . .

# (可选) 如果有构建步骤 (如 TypeScript 编译)，在此处添加
# RUN npm run build

# 创建日志和备份目录 (确保这些目录在容器内存在且应用有权限写入)
# 应用内部逻辑也应确保在写入前创建这些目录，以防万一
RUN mkdir -p logs backups && chown -R node:node logs backups

# 切换到非 root 用户 (node 用户是 Node.js 官方镜像内置的)
USER node

# 暴露应用监听的端口 (与 app.js 中 PORT 对应)
EXPOSE 3001

# 设置环境变量 (会被 docker-compose.yml 中的 env_file覆盖或补充)
ENV NODE_ENV=production

# 启动应用 (运行 app.js)
CMD ["node", "src/app.js"]
EOF

print_green "Docker配置文件创建完成！"
print_blue "========================================"
print_blue "           Docker配置摘要"
print_blue "========================================"
echo "已创建: docker-compose.yml"
echo "已创建: frontend/Dockerfile"
echo "已创建: frontend/nginx.conf"
echo "已创建: backend/Dockerfile"
print_yellow "继续执行前端基础配置脚本..."

exit 0
