#!/bin/bash
echo "测试告警功能..."
echo "1. 钉钉机器人"
echo "2. 企业微信机器人"
read -p "请选择类型 (1/2): " type

if [ "$type" = "1" ]; then
    alert_type="dingtalk"
elif [ "$type" = "2" ]; then
    alert_type="wechat"
else
    echo "无效的选择"
    exit 1
fi

read -p "请输入Webhook地址: " webhook

if [ -n "$webhook" ]; then
    curl -X POST http://localhost:3001/api/alert-configs/test \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"$alert_type\",\"webhook\":\"$webhook\"}" | python3 -m json.tool
else
    echo "Webhook地址不能为空"
fi
