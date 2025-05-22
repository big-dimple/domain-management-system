#!/bin/bash

# 域名管理系统 - 管理与启动脚本生成器
# 此脚本负责在项目根目录下创建一系列用于构建、启动、停止、查看日志和重置应用的Shell脚本。

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
# PROJECT_DIR 将从此文件加载
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
print_blue "    域名管理系统 - 管理与启动脚本生成器"
print_blue "========================================"
print_yellow "此脚本将在项目目录 '$PROJECT_DIR' 下创建以下管理脚本:"
echo "1. build.sh - 构建Docker镜像"
echo "2. start.sh - 启动应用服务 (后台运行)"
echo "3. stop.sh - 停止应用服务"
echo "4. logs.sh - 查看服务日志"
echo "5. reset.sh - 重置应用 (删除容器和数据卷，警告：数据会丢失!)"
echo "6. run.sh - 一键构建并启动应用"

# --- 创建构建脚本 (build.sh) ---
print_green "创建构建脚本 build.sh ..."
cat > "$PROJECT_DIR/build.sh" << 'EOF_BUILD'
#!/bin/bash

# 域名管理系统 - 构建脚本
# 构建 Docker 镜像 (如果镜像不存在或有更新)

# 获取脚本所在目录，并切换到该目录
cd "$(dirname "$0")" || exit 1

echo "========================================"
echo "      开始构建域名管理系统 Docker 镜像"
echo "========================================"

# 使用 docker-compose build 构建服务
# --pull 选项会尝试拉取最新的基础镜像
if docker-compose build --pull; then
    echo -e "\e[32mDocker 镜像构建完成！\e[0m"
    echo "您现在可以使用 './start.sh' 命令启动服务。"
else
    echo -e "\e[31mDocker 镜像构建失败！请检查上述错误信息。\e[0m"
    exit 1
fi
EOF_BUILD
chmod +x "$PROJECT_DIR/build.sh"

# --- 创建启动脚本 (start.sh) ---
print_green "创建启动脚本 start.sh ..."
cat > "$PROJECT_DIR/start.sh" << 'EOF_START'
#!/bin/bash

# 域名管理系统 - 启动脚本
# 以后台模式 (-d) 启动所有服务

cd "$(dirname "$0")" || exit 1

echo "========================================"
echo "      正在启动域名管理系统服务..."
echo "========================================"

# 启动服务 (后台运行)
# --remove-orphans 会移除不再由 compose 文件定义的服务的容器
if docker-compose up -d --remove-orphans; then
    echo -e "\e[32m服务已成功启动！\e[0m"
    echo "前端访问地址: http://localhost:8080 (或服务器IP:8080)"
    echo "后端API地址: http://localhost:3001/api (主要供Nginx代理访问)"
    echo ""
    echo "使用 './logs.sh' 查看实时日志。"
    echo "使用 './stop.sh' 停止服务。"
else
    echo -e "\e[31m服务启动失败！\e[0m"
    echo "请检查错误信息或使用 './logs.sh' 查看详细日志。"
    exit 1
fi
EOF_START
chmod +x "$PROJECT_DIR/start.sh"

# --- 创建停止脚本 (stop.sh) ---
print_green "创建停止脚本 stop.sh ..."
cat > "$PROJECT_DIR/stop.sh" << 'EOF_STOP'
#!/bin/bash

# 域名管理系统 - 停止脚本
# 停止并移除由 docker-compose up 创建的容器、网络

cd "$(dirname "$0")" || exit 1

echo "========================================"
echo "      正在停止域名管理系统服务..."
echo "========================================"

# 停止并移除容器
# docker-compose down 默认会移除容器和网络，但不会移除卷
if docker-compose down; then
    echo -e "\e[32m服务已成功停止并移除相关容器与网络。\e[0m"
else
    echo -e "\e[31m停止服务时发生错误。\e[0m"
fi
EOF_STOP
chmod +x "$PROJECT_DIR/stop.sh"

# --- 创建日志脚本 (logs.sh) ---
print_green "创建日志脚本 logs.sh ..."
cat > "$PROJECT_DIR/logs.sh" << 'EOF_LOGS'
#!/bin/bash

# 域名管理系统 - 日志查看脚本

cd "$(dirname "$0")" || exit 1

SERVICE_NAME="$1"
FOLLOW_FLAG="-f" # 默认实时跟踪日志

# 检查第二个参数是否为 --no-follow
if [ "$2" == "--no-follow" ]; then
    FOLLOW_FLAG=""
elif [ "$1" == "--no-follow" ] && [ -z "$SERVICE_NAME" ]; then # 如果第一个参数是 --no-follow 且没有服务名
    FOLLOW_FLAG=""
    SERVICE_NAME="" # 清空服务名，表示查看所有
fi


if [ -n "$SERVICE_NAME" ] && [ "$SERVICE_NAME" != "--no-follow" ]; then
    case "$SERVICE_NAME" in
        frontend|backend|mongodb)
            echo "正在查看服务 '$SERVICE_NAME' 的日志... (按 Ctrl+C 停止)"
            docker-compose logs ${FOLLOW_FLAG} "$SERVICE_NAME"
            ;;
        *)
            echo -e "\e[31m错误: 未知的服务名称 '$SERVICE_NAME'。\e[0m"
            echo "可用服务名: frontend, backend, mongodb。"
            echo "用法: ./logs.sh [服务名] [--no-follow]"
            echo "示例: ./logs.sh backend"
            echo "      ./logs.sh --no-follow (查看所有历史日志)"
            exit 1
            ;;
    esac
else
    echo "正在查看所有服务的日志... (按 Ctrl+C 停止)"
    docker-compose logs ${FOLLOW_FLAG}
fi
EOF_LOGS
chmod +x "$PROJECT_DIR/logs.sh"

# --- 创建重置脚本 (reset.sh) ---
print_green "创建重置脚本 reset.sh ..."
cat > "$PROJECT_DIR/reset.sh" << 'EOF_RESET'
#!/bin/bash

# 域名管理系统 - 重置脚本
# 警告: 此脚本将删除所有相关容器、网络和数据卷 (包括数据库数据)！

cd "$(dirname "$0")" || exit 1

echo "========================================"
echo "      重置域名管理系统"
echo "========================================"
echo -e "\e[31m警告: 此操作将彻底停止并删除所有应用容器、网络，\e[0m"
echo -e "\e[31m并且会删除所有关联的数据卷 (包括MongoDB数据库中的所有数据)！\e[0m"
echo -e "\e[31m此操作不可逆，所有数据将会丢失！\e[0m"
echo ""

read -p "您是否确定要继续重置操作? (请输入 'yes' 进行确认): " CONFIRMATION
echo

if [[ "$CONFIRMATION" != "yes" ]]; then
    echo -e "\e[33m操作已取消。系统未被重置。\e[0m"
    exit 1
fi

echo "正在停止并移除容器、网络和数据卷..."
# 使用 -v 选项来删除与服务关联的命名卷
# --remove-orphans 移除不再在 compose 文件中定义的服务的容器
if docker-compose down -v --remove-orphans; then
    echo -e "\e[32m系统已成功重置。\e[0m"
    echo "所有容器、网络和数据卷已被删除。"
    echo "您可以运行 './run.sh' 或 './build.sh' && './start.sh' 来重新部署。"
else
    echo -e "\e[31m重置过程中发生错误。请检查 Docker 和 Docker Compose 是否正常工作。\e[0m"
fi
EOF_RESET
chmod +x "$PROJECT_DIR/reset.sh"

# --- 创建一键启动脚本 (run.sh) ---
print_green "创建一键启动脚本 run.sh ..."
cat > "$PROJECT_DIR/run.sh" << 'EOF_RUN'
#!/bin/bash

# 域名管理系统 - 一键构建并启动脚本

cd "$(dirname "$0")" || exit 1

echo "========================================"
echo "      域名管理系统 - 一键启动流程"
echo "========================================"

# 步骤 1: 检查Docker环境
echo ""
echo "步骤 1: 检查Docker环境..."
if ! command -v docker &> /dev/null; then
    echo -e "\e[31m错误: Docker 未安装。请先安装 Docker。\e[0m"
    exit 1
fi
if ! docker info > /dev/null 2>&1; then
    echo -e "\e[31m错误: Docker 服务未运行或当前用户无权限访问。\e[0m"
    echo "请确保 Docker 服务已启动，并且当前用户已添加到 'docker' 组 (可能需要重新登录)。"
    exit 1
fi

# 检查 Docker Compose (v1 或 v2)
COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    echo "检测到 Docker Compose V2 (docker compose)，将使用此命令。"
else
    echo -e "\e[31m错误: Docker Compose (v1 'docker-compose' 或 v2 'docker compose') 未找到。\e[0m"
    echo "请先安装 Docker Compose。"
    exit 1
fi
# 如果使用的是 v2, 为后续脚本的 docker-compose 命令创建别名 (仅在此脚本作用域内)
if [ "$COMPOSE_CMD" == "docker compose" ]; then
    alias docker-compose='docker compose'
fi


# 步骤 2: 构建 Docker 镜像
echo ""
echo "步骤 2: 构建 Docker 镜像 (如果需要)..."
if ! ./build.sh; then # build.sh 内部会调用 docker-compose build
    echo -e "\e[31mDocker 镜像构建失败。请检查错误信息并重试。\e[0m"
    exit 1
fi

# 步骤 3: 启动服务
echo ""
echo "步骤 3: 启动应用服务..."
if ! ./start.sh; then # start.sh 内部会调用 docker-compose up -d
    echo -e "\e[31m应用服务启动失败。请检查错误信息或使用 './logs.sh' 查看日志。\e[0m"
    exit 1
fi

# 步骤 4: 等待服务初始化
echo ""
echo "步骤 4: 等待服务初始化 (约15-20秒)..."
sleep 20 # 给数据库和后端足够的时间启动和连接

# 步骤 5: 检查服务状态
echo ""
echo "步骤 5: 检查服务运行状态..."
docker-compose ps # 显示各服务状态

echo ""
echo "========================================"
echo -e "      \e[32m域名管理系统已成功启动！\e[0m"
echo "========================================"
echo "您现在可以通过以下地址访问系统:"
echo -e "  \e[1m前端 (浏览器访问):\e[0m \e[36mhttp://localhost:8080\e[0m  (如果在远程服务器，请用服务器IP替换localhost)"
echo ""
echo "常用管理命令 (在当前项目目录下运行):"
echo "  ./logs.sh                - 查看所有服务实时日志 (按 Ctrl+C 停止)"
echo "  ./logs.sh <服务名>       - 查看指定服务日志 (如: ./logs.sh backend)"
echo "  ./logs.sh --no-follow    - 查看所有服务历史日志 (不实时跟踪)"
echo "  ./stop.sh                - 停止所有服务"
echo "  ./start.sh               - (重新)启动已构建的服务"
echo "  ./build.sh               - 重新构建Docker镜像"
echo -e "  \e[31m./reset.sh\e[0m               - \e[31m\e[1m重置系统 (警告: 删除所有数据!)\e[0m"
echo "========================================"
EOF_RUN
chmod +x "$PROJECT_DIR/run.sh"


print_green "所有管理脚本已在 '$PROJECT_DIR' 目录中创建并设置执行权限。"
print_blue "========================================"
print_blue "         管理脚本创建摘要"
print_blue "========================================"
echo "已创建: build.sh, start.sh, stop.sh, logs.sh, reset.sh, run.sh"
print_yellow "后续安装脚本 (13_install_all.sh) 将完成最终的安装和可选的启动。"

exit 0
