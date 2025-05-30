#!/bin/bash
echo "测试域名扫描功能..."
read -p "请输入要测试的域名: " domain
if [ -n "$domain" ]; then
    curl -X POST http://localhost:3001/api/test-domain-scan \
        -H "Content-Type: application/json" \
        -d "{\"domain\":\"$domain\"}" | python3 -m json.tool
else
    echo "域名不能为空"
fi
