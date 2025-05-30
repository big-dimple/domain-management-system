#!/bin/bash
echo "检查系统状态..."
echo ""
echo "容器状态:"
./dc.sh ps
echo ""
echo "健康检查:"
curl -s http://localhost:3001/api/health | python3 -m json.tool
