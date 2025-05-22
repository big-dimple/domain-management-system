# 域名管理系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-18%2B-brightgreen)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-20%2B-blue)](https://www.docker.com/)

一个现代化的企业级域名管理系统，专为需要集中管理多个域名资产的企业和组织设计。提供直观的界面和强大的后台功能，帮助您全面掌握域名状态、到期日期和使用情况，并提供基于智能规则的续费建议。

## ✨ 主要特性

### 🎯 核心功能
- **全面域名管理** - 统一管理域名的基本信息、持有者、到期日期等
- **智能续费建议** - 基于业务使用、ICP状态等因素自动生成续费建议
- **批量操作** - 支持批量删除、批量评估续费建议
- **CSV导入导出** - 便捷的批量数据管理，支持标准格式导入导出
- **实时搜索筛选** - 多维度搜索和高级筛选功能
- **操作历史记录** - 完整的操作日志和变更追踪

### 📊 数据可视化
- **实时仪表盘** - 域名类型分布、续费建议分布
- **到期趋势分析** - 可视化域名到期时间分布
- **紧急提醒** - 突出显示需要立即关注的域名
- **统计报表** - 全面的域名资产统计

### 🔧 系统管理
- **健康状态监控** - 实时监控系统和数据库状态
- **自动到期检查** - 定期扫描域名到期情况
- **数据备份** - 内置数据备份功能
- **日志管理** - 完整的系统日志记录

## 🛠️ 技术架构

### 前端技术栈
- **React 18** - 现代化UI框架
- **Tailwind CSS** - 实用优先的CSS框架
- **Chart.js** - 数据可视化图表
- **Zustand** - 轻量级状态管理
- **React Router** - 单页应用路由
- **React Hook Form** - 高性能表单处理
- **Axios** - HTTP客户端库

### 后端技术栈
- **Node.js** - JavaScript运行时
- **Express.js** - Web应用框架
- **MongoDB** - NoSQL文档数据库
- **Mongoose** - MongoDB对象建模
- **Winston** - 企业级日志管理
- **JWT** - 身份认证(预留)
- **CSV处理** - 数据导入导出支持

### 基础设施
- **Docker** - 容器化部署
- **Docker Compose** - 多容器编排
- **Nginx** - 反向代理和静态资源服务

## 📋 系统要求

- **操作系统**: Linux、macOS 或 Windows
- **Docker**: 20.10.0 或更高版本
- **Docker Compose**: 2.0.0 或更高版本
- **端口**: 8080 (前端)、3001 (API，可选)、27017 (MongoDB，可选)
- **硬件**: 至少 1GB 内存、10GB 磁盘空间

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <your-repo-url>
cd domain-management-system
```

### 2. 环境配置
检查并根据需要修改 `.env` 文件中的配置：
```bash
# MongoDB连接信息
MONGO_USER=admin
MONGO_PASSWORD=your_secure_password
MONGODB_URI=mongodb://admin:your_secure_password@mongodb:27017/domain-management?authSource=admin

# 服务器配置
PORT=3001
NODE_ENV=production

# 其他配置...
```

### 3. 启动应用

#### 方式一：一键启动（推荐）
```bash
# 构建并启动所有服务
./run.sh
```

#### 方式二：分步启动
```bash
# 构建Docker镜像
./build.sh

# 启动服务
./start.sh
```

### 4. 访问应用
- **前端界面**: http://localhost:8080
- **API文档**: http://localhost:3001 (健康检查)

### 5. 常用管理命令
```bash
# 查看服务状态
docker-compose ps

# 查看实时日志
./logs.sh

# 查看特定服务日志
./logs.sh backend
./logs.sh frontend
./logs.sh mongodb

# 停止服务
./stop.sh

# 重置系统（警告：会删除所有数据！）
./reset.sh
```

## 📁 项目结构

```
domain-management-system/
├── frontend/                 # 前端React应用
│   ├── public/               # 静态资源
│   ├── src/
│   │   ├── components/       # React组件
│   │   │   ├── Dashboard/    # 仪表盘组件
│   │   │   └── Layout/       # 布局组件
│   │   ├── pages/            # 页面组件
│   │   ├── services/         # API服务
│   │   ├── stores/           # Zustand状态管理
│   │   └── utils/            # 工具函数
│   ├── Dockerfile           # 前端Docker配置
│   ├── nginx.conf           # Nginx配置
│   └── package.json         # 前端依赖
├── backend/                  # 后端Node.js应用
│   ├── src/
│   │   ├── controllers/      # 业务逻辑控制器
│   │   ├── models/           # MongoDB数据模型
│   │   ├── routes/           # API路由定义
│   │   ├── middlewares/      # Express中间件
│   │   ├── config/           # 配置文件
│   │   └── utils/            # 工具函数
│   ├── logs/                # 日志文件目录
│   ├── backups/             # 备份文件目录
│   ├── Dockerfile           # 后端Docker配置
│   └── package.json         # 后端依赖
├── docker-compose.yml       # Docker编排配置
├── .env                     # 环境变量配置
├── .env.example            # 环境变量模板
├── run.sh                  # 一键启动脚本
├── build.sh                # 构建脚本
├── start.sh                # 启动脚本
├── stop.sh                 # 停止脚本
├── logs.sh                 # 日志查看脚本
├── reset.sh                # 重置脚本
└── README.md               # 项目文档
```

## 📖 使用指南

### 域名管理
1. **添加域名**: 点击"添加域名"按钮，填写必要信息
2. **批量导入**: 使用CSV文件批量导入域名数据
3. **编辑域名**: 点击域名列表中的编辑图标
4. **删除域名**: 支持单个删除或批量删除
5. **续费评估**: 手动触发单个或批量续费建议评估

### 搜索和筛选
- **快速搜索**: 在搜索框中输入域名或持有者关键词
- **高级筛选**: 按域名类型、业务使用、ICP状态等条件筛选
- **到期筛选**: 快速查找30天、60天、90天内到期的域名
- **续费建议筛选**: 按不同的续费建议类型筛选

### CSV数据管理

#### 支持的CSV字段格式
| 字段名 | 必填 | 格式说明 | 示例 |
|--------|------|----------|------|
| 域名 | ✅ | 标准域名格式 | `example.com` |
| 域名类型 | ❌ | gTLD/ccTLD/New gTLD | `gTLD` |
| 到期日期 | ✅ | YYYY-MM-DD | `2024-12-31` |
| 持有者 | ❌ | 中文名称 | `某某科技公司` |
| 解析管理账号 | ❌ | 管理账号 | `admin@company.com` |
| 解析管理方 | ❌ | 服务商名称 | `Cloudflare` |
| 业务使用情况 | ❌ | 使用描述 | `公司官网` |
| ICP证 | ❌ | 备案号或状态 | `京ICP备XXXXXXXX号` |
| 年续费价 | ❌ | 价格信息 | `39元` |
| 标记为不续费 | ❌ | 是/否 | `否` |
| 具有特殊价值 | ❌ | 是/否 | `是` |
| 备注信息 | ❌ | 其他说明 | `重要域名` |

#### CSV导入导出操作
1. **导出**: 点击"导出为CSV"按钮，下载包含所有域名信息的CSV文件
2. **导入**: 
   - 选择符合格式的CSV文件
   - 点击"开始导入"
   - 查看导入结果统计和错误详情

### 续费建议规则

系统采用智能评估规则自动生成续费建议：

#### 评估优先级（按顺序）
1. **不续费** - 明确标记为不续费的域名
2. **建议续费** - 标记为具有特殊价值的域名
3. **建议续费** - 有实际业务使用的域名
4. **建议续费** - 已办理ICP证的域名
5. **可不续费** - 未使用的gTLD/New gTLD域名
6. **请示领导** - 未使用的中国ccTLD域名(.cn/.中国)
7. **可不续费** - 未使用的其他ccTLD域名
8. **待评估** - 其他需要人工判断的情况

### 系统管理

#### 健康状态监控
- 访问"系统状态"页面查看实时系统状况
- 监控数据库连接、服务器性能、域名统计等

#### 数据备份
- 在系统状态页面点击"开始备份"
- 备份文件保存在 `backend/backups/` 目录
- 包含域名数据、历史记录等完整信息

#### 日志管理
- 应用日志：`backend/logs/`
- 按日期轮转，自动压缩归档
- 支持不同级别的日志记录

## ⚙️ 系统配置

### 环境变量说明
```bash
# MongoDB配置
MONGO_USER=admin                    # MongoDB用户名
MONGO_PASSWORD=your_password        # MongoDB密码
MONGODB_URI=mongodb://...          # 完整连接字符串

# 服务器配置
PORT=3001                          # 后端API端口
NODE_ENV=production                # 运行环境
LOG_LEVEL=info                     # 日志级别

# 安全配置
ALLOWED_IP=*                       # IP白名单
```

### 自定义配置
- **端口修改**: 修改 `docker-compose.yml` 中的端口映射
- **数据库配置**: 修改 `.env` 文件中的MongoDB连接信息
- **日志级别**: 调整 `LOG_LEVEL` 环境变量
- **备份策略**: 可通过cron定期执行备份脚本

## 🔧 故障排除

### 常见问题

#### 启动失败
```bash
# 检查Docker服务状态
sudo systemctl status docker

# 检查端口占用
netstat -tlnp | grep :8080
netstat -tlnp | grep :3001

# 查看服务日志
./logs.sh
```

#### 数据库连接失败
```bash
# 检查MongoDB容器状态
docker-compose ps mongodb

# 查看MongoDB日志
./logs.sh mongodb

# 重启数据库服务
docker-compose restart mongodb
```

#### 前端构建失败
```bash
# 清理并重新构建
docker-compose down
docker system prune -f
./build.sh
```

#### CSV导入失败
- 检查CSV文件格式和编码（推荐UTF-8）
- 确认字段名称精确匹配
- 查看导入结果中的错误详情

### 性能优化

#### 数据库优化
- 定期清理历史记录
- 优化查询索引
- 监控数据库性能

#### 应用优化
- 调整日志级别
- 配置合适的内存限制
- 启用Nginx缓存

## 🚀 开发指南

### 本地开发环境

#### 前端开发
```bash
cd frontend
npm install
npm run dev          # 启动开发服务器 (http://localhost:3000)
```

#### 后端开发
```bash
cd backend
npm install
npm run dev          # 启动开发服务器 (使用nodemon)
```

### API接口概览

#### 域名管理
- `GET /api/domains` - 获取域名列表（支持分页、筛选、排序）
- `POST /api/domains` - 创建新域名
- `PUT /api/domains/:id` - 更新域名信息
- `DELETE /api/domains/:id` - 删除域名
- `POST /api/domains/:id/evaluate-renewal` - 评估续费建议
- `POST /api/domains/batch` - 批量操作
- `POST /api/domains/import` - CSV导入
- `GET /api/domains/export` - CSV导出

#### 系统管理
- `GET /api/system/health` - 系统健康检查
- `POST /api/system/check-expiries` - 检查域名到期
- `GET /api/system/backup` - 数据备份
- `GET /api/system/renewal-standards` - 获取续费标准

#### 数据统计
- `GET /api/dashboard/stats` - 仪表盘统计数据
- `GET /api/history` - 操作历史记录

### 代码贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🤝 支持

如果您在使用过程中遇到问题：

1. 查看本文档的故障排除部分
2. 查看系统日志：`./logs.sh`
3. 检查系统状态页面
4. 提交 Issue 描述问题

## 🎯 路线图

- [ ] 用户认证和权限管理
- [ ] 域名自动续费提醒
- [ ] 多语言支持
- [ ] API文档完善
- [ ] 移动端适配
- [ ] 更多数据可视化功能

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户！

---

**域名管理系统** - 让域名管理更简单、更智能！ 🚀
