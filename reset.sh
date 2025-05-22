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
