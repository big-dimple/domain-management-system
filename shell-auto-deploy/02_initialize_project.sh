#!/bin/bash

# 域名管理系统 - 项目初始化脚本
# 此脚本负责创建项目目录结构和基础配置文件

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

# 显示脚本信息
print_blue "========================================"
print_blue "    域名管理系统 - 项目初始化脚本"
print_blue "========================================"
print_yellow "此脚本将执行以下操作:"
echo "1. 设置MongoDB用户名和密码"
echo "2. 创建项目目录结构"
echo "3. 创建基础配置文件"

# 默认值
DEFAULT_MONGO_USER="admin"
DEFAULT_MONGO_PASSWORD="domain_mgmt_pwd"
DEFAULT_PROJECT_DIR="~/domain-management-system"

# 检查非交互模式
NON_INTERACTIVE_MODE=false
AUTO_INSTALL_FILE="/tmp/domain-management-system/auto_install" # 从此文件读取非交互配置

if [[ "$1" == "--non-interactive" && -f "$AUTO_INSTALL_FILE" ]]; then
    NON_INTERACTIVE_MODE=true
    # 从自动安装配置文件加载变量 (INSTALL_DIR, MONGO_USER, MONGO_PASSWORD)
    # 使用 source 命令时要小心，确保文件内容是可信的
    # 为安全起见，我们可以逐行读取并赋值
    while IFS='=' read -r key value; do
        case "$key" in
            INSTALL_DIR) NON_INTERACTIVE_INSTALL_DIR="$value" ;;
            MONGO_USER) NON_INTERACTIVE_MONGO_USER="$value" ;;
            MONGO_PASSWORD) NON_INTERACTIVE_MONGO_PASSWORD="$value" ;;
        esac
    done < "$AUTO_INSTALL_FILE"
fi

# 获取MongoDB凭据
if [ "$NON_INTERACTIVE_MODE" = "true" ]; then
    # 如果 MONGO_USER 或 MONGO_PASSWORD 在 auto_install 文件中未提供或为空，则使用默认值
    mongo_user=${NON_INTERACTIVE_MONGO_USER:-$DEFAULT_MONGO_USER}
    mongo_password=${NON_INTERACTIVE_MONGO_PASSWORD:-$DEFAULT_MONGO_PASSWORD}
    print_yellow "非交互模式：使用 MongoDB 用户名 '$mongo_user'。"
    # 为安全起见，不打印密码
else
    print_yellow "请设置MongoDB凭据:"
    read -p "MongoDB 用户名 (默认: $DEFAULT_MONGO_USER): " mongo_user_input
    mongo_user=${mongo_user_input:-$DEFAULT_MONGO_USER}
    read -sp "MongoDB 密码 (默认: $DEFAULT_MONGO_PASSWORD): " mongo_password_input
    mongo_password=${mongo_password_input:-$DEFAULT_MONGO_PASSWORD}
    echo # 换行，因为 read -sp 不会换行
fi

# 设置项目目录
if [ "$NON_INTERACTIVE_MODE" = "true" ]; then
    # INSTALL_DIR 来自 auto_install 文件
    project_dir=${NON_INTERACTIVE_INSTALL_DIR:-$DEFAULT_PROJECT_DIR}
    print_yellow "非交互模式：使用项目目录 '$project_dir'。"
else
    print_yellow "请指定项目安装目录 (默认: $DEFAULT_PROJECT_DIR):"
    read -p "> " project_dir_input
    project_dir=${project_dir_input:-$DEFAULT_PROJECT_DIR}
fi

# 展开波浪号(~)到用户主目录
project_dir="${project_dir/#\~/$HOME}"

# 检查目录是否已存在
if [ -d "$project_dir" ]; then
    if [ "$NON_INTERACTIVE_MODE" = "true" ]; then
        print_yellow "警告: 目录 $project_dir 已存在。在非交互模式下，将尽可能覆盖现有内容。"
    else
        print_red "警告: 目录 $project_dir 已存在。"
        read -p "是否继续? 这可能会覆盖现有配置文件 (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_red "初始化已取消。"
            exit 1
        fi
    fi
fi

# 创建项目主目录
print_green "创建项目主目录: $project_dir"
mkdir -p "$project_dir"
if [ $? -ne 0 ]; then
    print_red "创建项目目录失败，请检查权限或路径 '$project_dir' 是否有效。"
    exit 1
fi

# 创建项目目录结构
print_green "创建项目目录结构..."
mkdir -p "$project_dir"/{backend,frontend}
mkdir -p "$project_dir"/backend/src/{models,routes,controllers,services,utils,middlewares,config,scripts,data}
mkdir -p "$project_dir"/backend/{tests,logs,backups} # backups 目录用于存放数据库备份
mkdir -p "$project_dir"/frontend/{public,src/{components,pages,services,hooks,utils,stores,assets}}
mkdir -p "$project_dir"/frontend/src/components/{Dashboard,Layout} # 示例组件目录

# 创建.env.example文件 (示例环境变量文件)
print_green "创建环境配置文件 .env.example ..."
cat > "$project_dir/.env.example" << EOF
# MongoDB连接信息
MONGO_USER=admin
MONGO_PASSWORD=your_secure_password
MONGODB_URI=mongodb://admin:your_secure_password@mongodb:27017/domain-management?authSource=admin

# 服务器配置
PORT=3001
NODE_ENV=production # 可选值: development, production, test

# IP白名单配置 (示例，当前应用未使用)
ALLOWED_IP=*

# 日志级别 (winston支持: error, warn, info, http, verbose, debug, silly)
LOG_LEVEL=info
EOF

# 创建.env文件 (实际环境变量文件)
print_green "创建环境配置文件 .env ..."
cat > "$project_dir/.env" << EOF
# MongoDB连接信息
MONGO_USER=$mongo_user
MONGO_PASSWORD=$mongo_password
MONGODB_URI=mongodb://$mongo_user:$mongo_password@mongodb:27017/domain-management?authSource=admin

# 服务器配置
PORT=3001
NODE_ENV=production

# IP白名单配置
ALLOWED_IP=*

# 日志级别
LOG_LEVEL=info
EOF

# 复制环境变量到backend目录，供后端直接使用
cp "$project_dir/.env" "$project_dir/backend/.env"

# 保存配置信息到临时文件，供后续脚本使用
# 注意: /tmp 目录是临时存储，重启后会丢失
mkdir -p /tmp/domain-management-system
cat > /tmp/domain-management-system/config << EOF
PROJECT_DIR=$project_dir
MONGO_USER=$mongo_user
MONGO_PASSWORD=$mongo_password
EOF

print_green "项目初始化完成！"
print_blue "========================================"
print_blue "           初始化结果摘要"
print_blue "========================================"
echo "项目目录: $project_dir"
echo "MongoDB用户: $mongo_user"
echo "目录结构已创建。"
echo "配置文件 .env 和 .env.example 已生成。"
print_yellow "继续执行Docker配置脚本..."

exit 0
