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
