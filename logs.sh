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
