# 企业级域名管理系统

> 🚀 **让域名续费不再是噩梦，让SSL证书管理变得优雅**

## 🔥 为什么用？

### 您是否遇到过这些痛点？
- 😱 **域名到期忘记续费**，导致业务中断，损失惨重
- 🔥 **SSL证书过期**未察觉，用户看到安全警告，品牌形象受损
- 😵 **Excel管理混乱**，信息分散，多部门协作困难
- 💸 **续费决策困难**，哪些该续？哪些可以放弃？缺乏数据支撑
- 📱 **缺乏及时告警**，总是事后才发现问题，2个部门专员踢皮球甩锅

### 一站式解决
- ✅ **自动扫描**：每日凌晨自动更新域名到期时间，永不遗漏
- ✅ **智能决策**：基于业务价值智能推荐续费建议，省钱省心
- ✅ **统一告警**：飞书/钉钉/企微实时推送，多部门同步信息
- ✅ **可视化管理**：清爽UI，数据一目了然
- ✅ **批量操作**：CSV导入导出，轻松管理上千域名

## 🎯 核心功能

### 1. 域名生命周期管理
-  **WHOIS自动扫描** - 后端程序获取真实到期时间
-  **六级续费建议** - 紧急续费/建议续费/保持续费/请示领导/待评估/不续费
-  **批量导入导出** - 支持CSV格式，智能识别编码，excel和wps导出的csv都可以
-  **多维度标签** - 业务用途、企业ICP证、特殊价值标记

### 2. SSL证书监控
-  **实时监控** - 自动检测证书状态和剩余天数
-  **批量扫描** - 一键扫描所有域名SSL状态
-  **TXT导入** - 快速添加监控列表
-  **状态可视化** - 正常/警告/紧急/过期一目了然

### 3. 智能告警中心
- 🔔 **多渠道通知** - 钉钉、企微、飞书webhook
- ⏰ **分级告警** - 根据紧急程度自动分类
- 📅 **定时推送** - 每日中午12点汇总推送
- 🚨 **即时告警** - 支持手动触发紧急通知

### 4. 数据分析仪表盘
- 📈 **实时统计** - 域名总数、即将到期、月度预算
- 📊 **趋势分析** - 到期趋势图、状态分布图
- 💰 **预算管理** - 月度续费成本一目了然
- 🎯 **决策支持** - 数据驱动的续费决策

## ⚡ 快速开始

### 🌍 海外服务器 (官方的镜像源)
```bash
# 1. 克隆项目
git clone https://github.com/big-dimple/domain-management-system.git
cd domain-management-system

# 2. 一键启动，请先手动装一下docker
./start.sh

# 3. 访问系统
# 前端: http://你的IP:8080
# API:  http://你的IP:3001
```

### 🇨🇳 中国大陆服务器
```bash
# 1. 克隆项目
git clone https://github.com/big-dimple/domain-management-system.git
#科学上网#  wget https://github.com/big-dimple/domain-management-system/archive/refs/heads/master.zip
cd domain-management-system

# 2. 国内启动 (腾讯云ubuntu可直接运行)加速docker,npm,pip
./build-for-china.sh

```

### 📋 系统要求
- **操作系统**: Linux/macOS/Windows (WSL2)
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **内存**: 2GB+
- **磁盘**: 5GB+

### 🎛️ 可选配置
```bash
# 修改环境变量 (可选)
vim .env

# 自定义端口、数据库密码等
```

## 🛠️ 系统管理

### 常用命令
```bash
# 系统管理
./manager.sh status          # 查看状态
./manager.sh restart          # 重启系统
./manager.sh logs             # 查看日志
./manager.sh rebuild          # 完全重建,修改了yaml就需要重建


# 数据管理
./backup.sh                 # 备份数据库
./stop.sh                   # 停止系统
```

### 📁 脚本说明
| 脚本 | 功能 | 使用场景 |
|------|------|----------|
| `start.sh` | 启动系统 | 首次安装、日常启动 |
| `build-for-china.sh` | 国内优化启动 | 中国大陆服务器 |
| `manager.sh` | 系统管理 | 日常运维操作 |
| `test.sh` | 功能测试 | 验证系统功能 |
| `backup.sh` | 数据备份 | 定期备份 |
| `stop.sh` | 停止系统 | 维护时停止 |

## 📊 使用指南

### 1. 首次使用
1. 启动系统后访问 `http://你的IP:8080`
2. 在"域名管理"页面添加域名或批量导入CSV
3. 在"SSL监控"页面添加需要监控的域名
4. 在"告警中心"配置通知

### 2. 批量导入域名
- 支持CSV格式，表头必须包含：域名、到期日期
- 支持中文字段名：域名、域名类型、到期日期、持有者、业务使用、ICP证、续费价格、备注
- 自动识别编码，支持Excel/WPS导出的CSV文件

### 3. 告警配置
- **钉钉**: 群设置 → 智能群助手 → 添加机器人 → 自定义
- **企业微信**: 群设置 → 群机器人 → 添加
- **飞书**: 群设置 → 群机器人 → 添加机器人 → 自定义机器人

## 💼 适用场景

### 大型企业
- 管理数百个域名和SSL证书
- 多部门协作，需要统一平台
- 重视品牌形象，不容许服务中断

### 中小企业
- 域名数量增长快，管理混乱
- IT人员有限，需要自动化工具
- 预算有限，需要精准续费决策

### 互联网公司
- 多品牌、多产品线域名管理
- DevOps文化，追求自动化
- 快速迭代，需要可靠的基础设施

## 🛠️ 技术架构

- **前端**：React 18 + Tailwind CSS (Cloudflare风格UI)
- **后端**：Node.js + Express + MongoDB
- **容器化**：Docker + Docker Compose
- **自动化**：Cron定时任务 + WHOIS协议
- **告警**：Webhook集成 (钉钉/企业微信/飞书)

## 📸 界面预览

### 现代化管理界面
-  清爽设计，专业美观
-  响应式布局，完美适配各种设备
-  清晰的信息架构，操作直观

### 核心页面
1. **仪表盘** - 全局概览，关键指标
2. **域名管理** - 列表管理，批量操作
3. **SSL监控** - 证书状态，到期提醒
4. **告警中心** - 通知配置，历史记录
5. **帮助文档** - 详细指南，最佳实践

##  解决沟通难题

### 老板关心的
-  **成本控制** - 哪些域名值得续费？预算多少？
-  **风险管理** - 不会因为域名过期影响业务
-  **数据支撑** - 所有决策都有数据依据

### 运维关心的
-  **自动化** - 告别手工Excel，自动扫描更新
-  **及时告警** - 钉钉推送，不错过任何到期
-  **效率提升** - 批量操作，一键搞定

### 域名管理员关心的
-  **信息完整** - 所有域名信息集中管理
-  **分类清晰** - 按业务、部门、价值分类
-  **方便导出** - 随时生成报表汇报


## 🚨 故障排除


**Q: 告警发送失败？**
```bash
# 测试告警功能
./test.sh alert dingtalk

# 检查webhook地址是否正确
```

**Q: 系统运行缓慢？**
```bash
# 检查系统资源
./manager.sh status

# 清理Docker资源
./manager.sh cleanup
```

### 支持的域名后缀
- 支持所有提供WHOIS查询的域名后缀
- 特别优化：.com/.cn/.net/.org等主流后缀
- 中国域名：.cn/.com.cn/.net.cn等使用专门的查询服务器

## 💬 用户评价

> "自从用了DomainHub，再也没有因为域名过期出过事故！" - 某大型互联网公司运维总监

> "终于不用维护Excel了，所有信息一目了然！" - 某知名电商平台IT经理

> "老板问域名续费预算，我直接截图仪表盘，搞定！" - 某科技创业公司运维工程师

##  常见问题

**Q: 支持哪些域名后缀？**
A: 支持所有提供WHOIS查询的域名后缀（.com/.cn/.net等主流后缀均支持）

**Q: 可以管理多少个域名？**
A: 经测试可稳定管理1000+域名，取决于服务器配置

**Q: 数据安全吗？**
A: 所有数据持久化存储在本地MongoDB，支持定期备份，不依赖外部服务

**Q: 中国大陆网络环境如何使用？**
A: 使用 `./build-for-china.sh` 启动，自动配置镜像加速和国内源

##  技术支持

-  问题反馈：[GitHub Issues](https://github.com/big-dimple/domain-management-system/issues)

---

⭐ **如果觉得有用，请给个 [Star](https://github.com/big-dimple/domain-management-system)！**

> Built with ❤️ by 运维精英社
