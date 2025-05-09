#!/bin/bash

# 域名管理系统一键部署脚本 - Ubuntu 24.04

# 显示彩色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 显示标题
echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}      域名管理系统一键部署脚本 - Ubuntu 24.04      ${NC}"
echo -e "${GREEN}====================================================${NC}"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用root权限运行此脚本（sudo ./deploy.sh）${NC}"
  exit 1
fi

# 步骤1: 更新系统包
echo -e "\n${YELLOW}[步骤1] 更新系统包...${NC}"
apt-get update
if [ $? -ne 0 ]; then
  echo -e "${RED}系统更新失败，请检查网络连接并重试。${NC}"
  exit 1
fi
apt-get upgrade -y

# 步骤2: 安装必要的依赖
echo -e "\n${YELLOW}[步骤2] 安装必要的依赖...${NC}"
apt-get install -y apt-transport-https ca-certificates curl software-properties-common gnupg

# 步骤3: 安装Docker
echo -e "\n${YELLOW}[步骤3] 安装Docker...${NC}"
# 添加Docker的官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 设置稳定版仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# 更新apt包索引
apt-get update

# 安装Docker Engine
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 检查Docker是否安装成功
if ! command -v docker &> /dev/null; then
  echo -e "${RED}Docker安装失败，请手动安装后重试。${NC}"
  exit 1
fi

# 启动Docker并设置开机自启
systemctl start docker
systemctl enable docker

# 安装Docker Compose插件
echo -e "\n${YELLOW}[步骤4] 确认Docker Compose已安装...${NC}"
if ! docker compose version &> /dev/null; then
  echo -e "${RED}Docker Compose插件安装失败，请手动安装后重试。${NC}"
  exit 1
fi

# 步骤5: 修复前端项目结构
echo -e "\n${YELLOW}[步骤5] 修复前端项目结构...${NC}"

# 确保前端目录存在
mkdir -p frontend

# 创建index.html在前端根目录
cat > frontend/index.html << EOF
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>域名管理系统</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.jsx"></script>
  </body>
</html>
EOF

echo -e "${GREEN}创建了frontend/index.html${NC}"

# 创建vite.config.js
cat > frontend/vite.config.js << EOF
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
  },
})
EOF

echo -e "${GREEN}创建了frontend/vite.config.js${NC}"

# 更新前端Dockerfile
cat > frontend/Dockerfile << EOF
# 构建阶段
FROM node:18-alpine as build

WORKDIR /app

# 复制package.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制所有文件
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:18-alpine

WORKDIR /app

# 从构建阶段复制构建结果
COPY --from=build /app/build /app/build
COPY --from=build /app/package.json /app/package.json

# 安装serve
RUN npm install -g serve

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["serve", "-s", "build", "-l", "3000"]
EOF

echo -e "${GREEN}更新了frontend/Dockerfile${NC}"

# 步骤6: 修复后端Dockerfile
echo -e "\n${YELLOW}[步骤6] 修复后端Dockerfile...${NC}"

# 确保后端目录存在
mkdir -p backend

# 更新后端Dockerfile
cat > backend/Dockerfile << EOF
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
EOF

echo -e "${GREEN}更新了backend/Dockerfile${NC}"

# 步骤7: 修复docker-compose.yml
echo -e "\n${YELLOW}[步骤7] 更新docker-compose.yml...${NC}"

# 创建docker-compose.yml
cat > docker-compose.yml << EOF
services:
  # MongoDB服务
  mongodb:
    image: mongo:6.0
    container_name: domain-management-mongodb
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: \${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: \${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
    networks:
      - domain-management-network

  # 后端API服务
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    container_name: domain-management-backend
    restart: always
    depends_on:
      - mongodb
    environment:
      - NODE_ENV=production
      - PORT=3001
      - MONGODB_URI=mongodb://\${MONGO_USER}:\${MONGO_PASSWORD}@mongodb:27017/domain-management?authSource=admin
      - ALLOWED_IP=\${ALLOWED_IP}
    ports:
      - "3001:3001"
    networks:
      - domain-management-network

  # 前端应用
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: domain-management-frontend
    restart: always
    depends_on:
      - backend
    volumes:
      - frontend_build:/app/build
    networks:
      - domain-management-network

  # Nginx服务
  nginx:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    container_name: domain-management-nginx
    restart: always
    depends_on:
      - frontend
      - backend
    ports:
      - "80:80"
    volumes:
      - frontend_build:/usr/share/nginx/html
    networks:
      - domain-management-network

networks:
  domain-management-network:
    driver: bridge

volumes:
  mongodb_data:
  frontend_build:
EOF

echo -e "${GREEN}更新了docker-compose.yml${NC}"

# 步骤8: 设置环境变量
echo -e "\n${YELLOW}[步骤8] 设置环境变量...${NC}"

# 生成随机密码
MONGO_PASSWORD=$(openssl rand -base64 16)

# 创建.env文件
cat > .env << EOF
# MongoDB连接信息
MONGO_USER=admin
MONGO_PASSWORD=${MONGO_PASSWORD}
MONGODB_URI=mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/domain-management?authSource=admin

# 服务器配置
PORT=3001
NODE_ENV=production

# IP白名单配置
ALLOWED_IP=*
EOF

echo -e "${GREEN}.env文件已创建${NC}"

# 同样创建backend/.env
if [ ! -d backend ]; then
  mkdir -p backend
fi

cp .env backend/.env
echo -e "${GREEN}backend/.env文件已创建${NC}"

# 确保nginx目录和配置存在
echo -e "\n${YELLOW}[步骤9] 设置Nginx配置...${NC}"

mkdir -p nginx
cat > nginx/Dockerfile << EOF
FROM nginx:1.25-alpine

# 删除默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义配置
COPY nginx.conf /etc/nginx/conf.d/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF

cat > nginx/nginx.conf << EOF
server {
    listen 80;
    server_name localhost;

    # 访问日志
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # 前端静态文件
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    # API 请求转发到后端服务
    location /api {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 大文件传输优化
    client_max_body_size 10M;
    
    # 开启GZIP压缩
    gzip on;
    gzip_disable "msie6";
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;
    gzip_types
        application/atom+xml
        application/javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rss+xml
        application/vnd.geo+json
        application/vnd.ms-fontobject
        application/x-font-ttf
        application/x-web-app-manifest+json
        application/xhtml+xml
        application/xml
        font/opentype
        image/bmp
        image/svg+xml
        image/x-icon
        text/cache-manifest
        text/css
        text/plain
        text/vcard
        text/vnd.rim.location.xloc
        text/vtt
        text/x-component
        text/x-cross-domain-policy;
}
EOF

echo -e "${GREEN}Nginx配置已创建${NC}"

# 步骤10: 启动服务
echo -e "\n${YELLOW}[步骤10] 启动域名管理系统...${NC}"
docker compose down
docker compose build

echo -e "\n${YELLOW}构建完成，正在启动服务...${NC}"
docker compose up -d

# 检查服务状态
echo -e "\n${YELLOW}[步骤11] 检查服务状态...${NC}"
docker compose ps

# 获取服务器IP
SERVER_IP=$(curl -s ifconfig.me)

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}      域名管理系统部署完成!      ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "\n您现在可以通过以下地址访问系统:"
echo -e "${GREEN}http://${SERVER_IP}${NC}"
echo -e "\nMongoDB管理员账号:"
echo -e "用户名: ${GREEN}admin${NC}"
echo -e "密码: ${GREEN}${MONGO_PASSWORD}${NC}"
echo -e "\n备份此密码信息以便将来使用!"
echo -e "${GREEN}====================================================${NC}"

# 保存密码到文件以备后用
echo "MongoDB用户名: admin" > mongodb_credentials.txt
echo "MongoDB密码: ${MONGO_PASSWORD}" >> mongodb_credentials.txt
echo -e "${YELLOW}凭据已保存到 mongodb_credentials.txt 文件${NC}"
