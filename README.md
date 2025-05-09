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
- **服务器**: Nginx

## 快速开始

### 前提条件

- [Docker](https://www.docker.com/get-started) 和 [Docker Compose](https://docs.docker.com/compose/install/)
- 服务器或本地环境

### 安装步骤

1. **克隆仓库**

```bash
git clone https://github.com/your-username/domain-management-system.git
cd domain-management-system
```

2. **配置环境变量**

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置MongoDB用户名密码和IP白名单等信息。

3. **启动服务**

```bash
docker-compose up -d
```

4. **访问系统**

打开浏览器访问 `http://localhost` 或服务器IP地址。

### 本地开发环境

如果希望在本地进行开发：

1. **启动MongoDB**

```bash
docker-compose up -d mongodb
```

2. **启动后端**

```bash
cd backend
npm install
npm run dev
```

3. **启动前端**

```bash
cd frontend
npm install
npm run dev
```

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

## CentOS 7.9 安装指南

在CentOS 7.9上部署系统：

1. **安装Docker和Docker Compose**

```bash
# 安装必要的依赖
sudo yum install -y yum-utils device-mapper-persistent-data lvm2

# 添加Docker源
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io

# 启动Docker
sudo systemctl start docker
sudo systemctl enable docker

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
```

2. **克隆和配置**

```bash
git clone https://github.com/your-username/domain-management-system.git
cd domain-management-system
cp .env.example .env
```

编辑 `.env` 文件，配置环境变量。

3. **启动系统**

```bash
docker-compose up -d
```

## 系统维护

### 备份数据

备份MongoDB数据：

```bash
docker exec domain-management-mongodb sh -c 'mongodump --username=${MONGO_USER} --password=${MONGO_PASSWORD} --authenticationDatabase=admin --db=domain-management --out=/tmp/backup'
docker cp domain-management-mongodb:/tmp/backup ./mongo_backup
```

### 更新系统

```bash
# 拉取最新代码
git pull

# 重新构建和启动容器
docker-compose down
docker-compose build
docker-compose up -d
```

### 查看日志

```bash
# 查看所有容器日志
docker-compose logs

# 查看特定服务日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
```

## 自定义和扩展

### 修改Nginx配置

编辑 `nginx/nginx.conf` 文件，然后重新构建Nginx容器：

```bash
docker-compose build nginx
docker-compose up -d nginx
```

### 修改WHOIS检查频率

编辑 `backend/src/index.js` 中的cron表达式：

```javascript
// 默认每周一凌晨3点执行
cron.schedule('0 3 * * 1', async () => { ... });

// 修改为每天凌晨3点执行
cron.schedule('0 3 * * *', async () => { ... });
```

然后重新构建后端容器：

```bash
docker-compose build backend
docker-compose up -d backend
```

## 常见问题

### MongoDB连接失败

检查 `.env` 文件中的MongoDB连接信息是否正确，确保MongoDB容器已启动：

```bash
docker-compose ps
```

### 无法访问系统

检查Nginx容器是否正常运行，确认服务器防火墙是否开放80端口：

```bash
# 检查容器状态
docker-compose ps

# 检查防火墙规则
sudo firewall-cmd --list-all

# 如需开放80端口
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
```

### WHOIS查询失败

某些域名注册商可能限制WHOIS查询频率，可以调整 `backend/src/cron/domainChecker.js` 中的延迟时间：

```javascript
// 修改延迟时间（毫秒）
await new Promise(resolve => setTimeout(resolve, 5000)); // 改为5秒
```

## 贡献指南

欢迎贡献代码、报告问题或提出新功能建议。请遵循以下步骤：

1. Fork仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 邮箱: your-email@example.com
- GitHub Issues: [https://github.com/your-username/domain-management-system/issues](https://github.com/your-username/domain-management-system/issues)
