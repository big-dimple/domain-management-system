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
