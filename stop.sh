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
