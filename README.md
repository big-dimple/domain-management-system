# 域名管理系统

这是一个现代化的域名管理系统，帮助您集中管理、追踪和监控多个公司/主体的域名资产。系统提供了直观的界面，支持域名列表查看、信息筛选、到期提醒、历史记录追踪等功能，并能自动检查域名的到期日期。

## 功能特点

- **域名综合管理**: 集中管理所有域名，包括类型、持有者、到期日期、解析管理信息等
- **数据可视化**: 仪表盘展示域名分布、到期趋势等数据图表
- **历史记录追踪**: 记录所有域名操作历史，方便审计和回溯
- **自动检查**: 定期自动检查域名到期日期，确保信息准确性
- **CSV导入导出**: 支持批量导入和导出域名数据
- **到期提醒**: 突出显示即将到期的域名，发出及时提醒
- **续费标准**: 内置续费标准参考，辅助决策
- **响应式界面**: 完全响应式设计，支持各种设备访问

## 系统架构

- **前端**: React + Tailwind CSS
- **后端**: Node.js + Express
- **数据库**: MongoDB
- **容器化**: Docker + Docker Compose

## 快速开始

### 前提条件

- Docker和Docker Compose
- 确保端口8080、3001和27017未被占用

### 部署步骤

1. **克隆仓库**

```bash
git clone https://github.com/your-username/domain-management-system.git
cd domain-management-system
```

2. **启动服务**

```bash
docker compose up -d
```

3. **访问系统**

访问 `http://your-server-ip:8080`

## 在Linux上安装Docker和部署

无论是Ubuntu、CentOS还是其他Linux发行版，都可以使用以下简单步骤部署：

### 1. 安装Docker和Docker Compose

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y   # Ubuntu/Debian
# 或
sudo yum update -y                       # CentOS/RHEL

# 安装Docker
curl -fsSL https://get.docker.com | sh

# 启动Docker并设置开机自启
sudo systemctl start docker
sudo systemctl enable docker

# 验证Docker安装成功
docker --version
docker compose version
```

### 2. 克隆项目并部署

```bash
# 克隆项目
git clone https://github.com/your-username/domain-management-system.git
cd domain-management-system

# 设置MongoDB凭据
cat > .env << EOF
# MongoDB连接信息
MONGO_USER=admin
MONGO_PASSWORD=your_secure_password
MONGODB_URI=mongodb://admin:your_secure_password@mongodb:27017/domain-management?authSource=admin

# 服务器配置
PORT=3001
NODE_ENV=production

# IP白名单配置
ALLOWED_IP=*
EOF

# 复制环境配置到后端目录
mkdir -p backend
cp .env backend/.env

# 启动服务
docker compose up -d
```

### 3. 验证部署

```bash
# 查看容器状态
docker compose ps
```

系统应该在约1-2分钟内完成初始化并可访问。

## 使用指南

### 域名列表

- **查看域名**: 访问首页即可查看所有域名列表
- **添加域名**: 点击"添加域名"按钮
- **编辑域名**: 点击域名行中的编辑图标
- **删除域名**: 点击域名行中的删除图标
- **筛选域名**: 使用表格上方的筛选器
- **搜索域名**: 使用搜索框全局搜索
- **导入导出**: 使用导入/导出按钮批量操作

### 仪表盘

- 查看域名统计数据
- 查看域名类型、持有者、使用情况分布
- 查看域名到期趋势
- 接收域名管理建议

### 历史记录

- 查看所有域名操作记录
- 按操作类型筛选历史记录
- 按域名筛选历史记录
- 搜索特定历史记录

### 域名检查

- 系统每周自动检查域名到期日期
- 可手动触发域名检查

## 系统维护

### 常用Docker命令

```bash
# 停止服务
docker compose down

# 启动服务
docker compose up -d

# 重新构建并启动（代码有更新时）
docker compose build
docker compose up -d

# 查看日志
docker compose logs
docker compose logs frontend
docker compose logs backend

# 重启特定服务
docker compose restart backend
```

### 备份数据

```bash
# 备份MongoDB数据
docker exec domain-management-mongodb sh -c 'mongodump --username=${MONGO_USER} --password=${MONGO_PASSWORD} --authenticationDatabase=admin --db=domain-management --out=/tmp/backup'
docker cp domain-management-mongodb:/tmp/backup ./mongo_backup
```

## 常见问题

### 端口冲突

如果8080端口已被占用，可以在docker-compose.yml中修改前端服务的端口映射：

```yaml
ports:
  - "8081:80"  # 将8080改为其他未被占用的端口
```

### MongoDB连接失败

检查.env文件中的MongoDB连接信息是否正确，确保MongoDB容器已启动：

```bash
docker compose ps
```

### WHOIS查询失败

某些域名注册商可能限制WHOIS查询频率，可以调整`backend/src/cron/domainChecker.js`中的延迟时间：

```javascript
// 修改延迟时间（毫秒）
await new Promise(resolve => setTimeout(resolve, 5000)); // 改为5秒
```


## 联系方式
helloworld
