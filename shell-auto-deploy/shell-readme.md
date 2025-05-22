# 域名管理系统安装脚本

## 脚本说明

本项目通过 13 个脚本自动生成完整的域名管理系统代码和配置：

- `01_install_dependencies.sh` - 安装系统依赖（Docker等）
- `02_initialize_project.sh` - 创建项目目录结构
- `03_setup_docker.sh` - 生成 Docker 配置
- `04_setup_frontend_config.sh` - 前端基础配置
- `05_setup_frontend_api.sh` - 前端API服务
- `06_setup_frontend_components.sh` - 前端基础组件
- `07_setup_frontend_pages.sh` - 前端页面组件
- `08_setup_frontend_interactive.sh` - 前端交互组件
- `09_setup_frontend_charts.sh` - 前端图表组件
- `10_setup_backend_config.sh` - 后端核心配置
- `11_setup_backend_models.sh` - 后端模型和控制器
- `12_setup_management_scripts.sh` - 管理脚本
- `13_install_all.sh` - 总安装脚本

## 快速安装

### 系统要求
- Linux/macOS 系统
- 支持 Docker 和 Docker Compose

### 安装步骤

1. **给脚本执行权限**
   ```bash
   chmod +x 13_install_all.sh
   ```

2. **运行安装脚本**
   ```bash
   ./13_install_all.sh
   ```

3. **按提示输入**
   - 项目安装目录（默认：`~/domain-management-system`）
   - MongoDB 用户名（默认：`admin`）
   - MongoDB 密码（默认：`domain_mgmt_pwd`）

4. **等待安装完成**
   脚本会自动：
   - 安装系统依赖
   - 生成项目代码
   - 创建 Docker 配置

## 无人值守安装

```bash
./13_install_all.sh --non-interactive \
  --install-dir=/path/to/project \
  --mongo-user=admin \
  --mongo-password=yourpassword
```
