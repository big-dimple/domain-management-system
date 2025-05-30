#!/bin/bash

show_help() {
    echo "域名管理系统 - 测试工具"
    echo ""
    echo "用法: ./test.sh <测试类型> [参数]"
    echo ""
    echo "测试类型:"
    echo "  domain <域名>        测试域名扫描功能"
    echo "  ssl <域名>           测试SSL证书扫描"
    echo "  alert <类型>         测试告警功能"
    echo "  health              系统健康检查"
    echo "  all                 运行所有基础测试"
    echo ""
    echo "告警类型:"
    echo "  dingtalk            钉钉机器人"
    echo "  wechat              企业微信机器人"
    echo "  feishu              飞书机器人"
    echo ""
    echo "示例:"
    echo "  ./test.sh domain baidu.com"
    echo "  ./test.sh ssl github.com"
    echo "  ./test.sh alert dingtalk"
    echo "  ./test.sh health"
    echo "  ./test.sh all"
}

test_domain_scan() {
    local domain=$1
    
    if [ -z "$domain" ]; then
        read -p "请输入要测试的域名: " domain
    fi
    
    if [ -z "$domain" ]; then
        echo "❌ 域名不能为空"
        exit 1
    fi
    
    echo "🔍 测试域名扫描功能: $domain"
    echo "发送请求到API..."
    
    curl -X POST http://localhost:3001/api/test-domain-scan \
        -H "Content-Type: application/json" \
        -d "{\"domain\":\"$domain\"}" \
        -w "\n状态码: %{http_code}\n" | python3 -m json.tool 2>/dev/null || {
        echo "❌ 请求失败，请检查:"
        echo "  1. 系统是否正常运行 (./manage.sh status)"
        echo "  2. 域名是否正确"
        echo "  3. 网络连接是否正常"
    }
}

test_ssl_scan() {
    local domain=$1
    
    if [ -z "$domain" ]; then
        read -p "请输入要测试的域名: " domain
    fi
    
    if [ -z "$domain" ]; then
        echo "❌ 域名不能为空"
        exit 1
    fi
    
    echo "🔒 测试SSL证书扫描功能: $domain"
    echo "发送请求到API..."
    
    curl -X POST http://localhost:3001/api/test-ssl-scan \
        -H "Content-Type: application/json" \
        -d "{\"domain\":\"$domain\"}" \
        -w "\n状态码: %{http_code}\n" | python3 -m json.tool 2>/dev/null || {
        echo "❌ 请求失败，请检查:"
        echo "  1. 系统是否正常运行"
        echo "  2. 域名是否有SSL证书"
        echo "  3. 网络连接是否正常"
    }
}

test_alert() {
    local alert_type=$1
    
    if [ -z "$alert_type" ]; then
        echo "请选择告警类型:"
        echo "1. 钉钉机器人"
        echo "2. 企业微信机器人"
        echo "3. 飞书机器人"
        read -p "请输入选项 (1-3): " choice
        
        case $choice in
            1) alert_type="dingtalk" ;;
            2) alert_type="wechat" ;;
            3) alert_type="feishu" ;;
            *) echo "❌ 无效选择"; exit 1 ;;
        esac
    fi
    
    case $alert_type in
        dingtalk|wechat|feishu)
            read -p "请输入${alert_type}的Webhook地址: " webhook
            ;;
        *)
            echo "❌ 不支持的告警类型: $alert_type"
            echo "支持的类型: dingtalk, wechat, feishu"
            exit 1
            ;;
    esac
    
    if [ -z "$webhook" ]; then
        echo "❌ Webhook地址不能为空"
        exit 1
    fi
    
    echo "📢 测试${alert_type}告警功能..."
    echo "发送测试消息到: $webhook"
    
    curl -X POST http://localhost:3001/api/alert-configs/test \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"$alert_type\",\"webhook\":\"$webhook\"}" \
        -w "\n状态码: %{http_code}\n" | python3 -m json.tool 2>/dev/null || {
        echo "❌ 告警测试失败，请检查:"
        echo "  1. Webhook地址是否正确"
        echo "  2. 机器人是否正确配置"
        echo "  3. 网络是否可以访问对应平台"
    }
}

test_health() {
    echo "🏥 系统健康检查..."
    
    # 检查服务状态
    echo ""
    echo "📋 Docker服务状态:"
    docker-compose ps
    
    # 检查API健康
    echo ""
    echo "🔗 API健康检查:"
    api_response=$(curl -s http://localhost:3001/api/health)
    if [ $? -eq 0 ]; then
        echo "$api_response" | python3 -m json.tool 2>/dev/null || echo "$api_response"
    else
        echo "❌ API无法访问"
    fi
    
    # 检查前端
    echo ""
    echo "🌐 前端服务检查:"
    frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
    if [ "$frontend_status" = "200" ]; then
        echo "✅ 前端服务正常 (HTTP $frontend_status)"
    else
        echo "❌ 前端服务异常 (HTTP $frontend_status)"
    fi
    
    # 检查数据库连接
    echo ""
    echo "🗄️  数据库连接检查:"
    mongodb_status=$(docker-compose exec -T mongodb mongo --eval "db.adminCommand('ismaster')" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "✅ MongoDB连接正常"
    else
        echo "❌ MongoDB连接失败"
    fi
    
    # 检查磁盘空间
    echo ""
    echo "💾 磁盘空间检查:"
    df -h | grep -E "/$|/var|/tmp" | head -3
    
    # 检查内存使用
    echo ""
    echo "🧠 内存使用情况:"
    free -h | head -2
}

test_all() {
    echo "🧪 运行所有基础测试..."
    echo ""
    
    # 健康检查
    echo "=== 1. 系统健康检查 ==="
    test_health
    
    echo ""
    echo "=== 2. 域名扫描测试 ==="
    echo "使用 baidu.com 进行测试..."
    test_domain_scan "baidu.com"
    
    echo ""
    echo "=== 3. SSL证书测试 ==="
    echo "使用 baidu.com 进行测试..."
    test_ssl_scan "baidu.com"
    
    echo ""
    echo "✅ 基础测试完成!"
    echo ""
    echo "💡 如需测试告警功能，请运行:"
    echo "   ./test.sh alert"
}

# 主程序
case "$1" in
    domain)
        test_domain_scan "$2"
        ;;
    ssl)
        test_ssl_scan "$2"
        ;;
    alert)
        test_alert "$2"
        ;;
    health)
        test_health
        ;;
    all)
        test_all
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        show_help
        ;;
    *)
        echo "❌ 未知的测试类型: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
