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
