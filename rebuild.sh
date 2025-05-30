#!/bin/bash
echo "停止服务..."
./dc.sh down

echo "删除容器..."
docker rm -f $(docker ps -aq --filter "name=domain-management-system") 2>/dev/null || echo "没有相关容器需要删除"

echo "删除镜像..."
docker rmi -f domain-management-system-frontend domain-management-system-backend 2>/dev/null || echo "没有相关镜像需要删除"

echo "重新构建并启动..."
./start.sh

echo "重建完成！"
