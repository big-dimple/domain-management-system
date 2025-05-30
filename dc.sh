#!/bin/bash
# Docker Compose命令包装器
if docker compose version &> /dev/null; then
    docker compose "$@"
else
    docker-compose "$@"
fi
