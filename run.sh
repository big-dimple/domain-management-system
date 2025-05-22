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
