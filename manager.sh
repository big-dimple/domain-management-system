#!/bin/bash

show_help() {
    echo "域名管理系统 - 管理工具"
    echo ""
    echo "用法: ./manage.sh <命令> [选项]"
    echo ""
    echo "命令:"
    echo "  restart [--update]    重启系统 (可选：同时更新代码)"
    echo "  status               检查系统状态"
    echo "  logs [type]          查看日志 (scan/ssl/alert/服务名)"
    echo "  rebuild              完全重建系统"
    echo "  cleanup              清理无用的Docker镜像"
    echo ""
    echo "示例:"
    echo "  ./manage.sh restart           # 简单重启"
    echo "  ./manage.sh restart --update  # 重启并更新代码"
    echo "  ./manage.sh logs scan         # 查看域名扫描日志"
    echo "  ./manage.sh logs backend      # 查看后端服务日志"
    echo "  ./manage.sh rebuild           # 完全重建"
}

restart_system() {
    local update_code=$1
    
    if [ "$update_code" = "--update" ]; then
        echo "🔄 重启并更新系统..."
        echo "1. 拉取最新代码..."
        git pull origin main 2>/dev/null || echo "⚠️  未检测到git仓库，跳过代码更新"
        
        echo "2. 停止服务..."
        ./dc.sh down
        
        echo "3. 清理旧镜像..."
        docker image prune -f
        docker rmi -f $(docker images | grep "domain-management-system" | awk '{print $3}') 2>/dev/null || true
        
        echo "4. 重新构建并启动..."
        ./dc.sh up -d --build
    else
        echo "🔄 重启系统..."
        ./dc.sh restart
    fi
    
    echo "✅ 系统重启完成"
    show_system_status
}

show_system_status() {
    echo ""
    echo "📊 系统状态:"
    ./dc.sh ps
    
    echo ""
    echo "🏥 健康检查:"
    curl -s http://localhost:3001/api/health | python3 -m json.tool 2>/dev/null || echo "❌ API健康检查失败"
    
    echo ""
    echo "🌐 访问地址:"
    echo "  前端: http://localhost:8080"
    echo "  API:  http://localhost:3001"
}

show_logs() {
    local log_type=$1
    
    case "$log_type" in
        scan)
            echo "📋 查看域名扫描日志..."
            tail -f ./logs/scan_$(date +%Y-%m-%d).log 2>/dev/null || echo "❌ 扫描日志文件不存在"
            ;;
        ssl)
            echo "📋 查看SSL扫描日志..."
            tail -f ./logs/ssl_$(date +%Y-%m-%d).log 2>/dev/null || echo "❌ SSL日志文件不存在"
            ;;
        alert)
            echo "📋 查看告警日志..."
            tail -f ./logs/alert_$(date +%Y-%m-%d).log 2>/dev/null || echo "❌ 告警日志文件不存在"
            ;;
        frontend|backend|mongodb)
            echo "📋 查看 $log_type 服务日志..."
            ./dc.sh logs -f "$log_type"
            ;;
        "")
            echo "📋 查看所有服务日志..."
            ./dc.sh logs -f
            ;;
        *)
            echo "❌ 未知的日志类型: $log_type"
            echo "支持的类型: scan, ssl, alert, frontend, backend, mongodb"
            ;;
    esac
}

rebuild_system() {
    echo "🔥 完全重建系统..."
    echo ""
    echo "⚠️  警告: 这将删除所有容器和镜像，但保留数据库数据"
    read -p "是否继续? (y/N): " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
        echo "1. 停止所有服务..."
        ./dc.sh down
        
        echo "2. 删除相关容器..."
        docker rm -f $(docker ps -aq --filter "name=domain-management-system") 2>/dev/null || echo "没有相关容器需要删除"
        
        echo "3. 删除相关镜像..."
        docker rmi -f $(docker images | grep "domain-management-system" | awk '{print $3}') 2>/dev/null || echo "没有相关镜像需要删除"
        
        echo "4. 清理无用资源..."
        docker system prune -f
        
        echo "5. 重新构建并启动..."
        ./start.sh
        
        echo "✅ 系统重建完成!"
    else
        echo "❌ 操作已取消"
    fi
}

cleanup_docker() {
    echo "🧹 清理Docker资源..."
    
    echo "清理停止的容器..."
    docker container prune -f
    
    echo "清理无用的镜像..."
    docker image prune -f
    
    echo "清理无用的网络..."
    docker network prune -f
    
    echo "清理无用的卷 (不包括数据库)..."
    docker volume prune -f --filter "label!=com.docker.compose.project=domain-management-system"
    
    echo "✅ 清理完成"
    
    echo ""
    echo "💾 磁盘使用情况:"
    docker system df
}

# 主程序
case "$1" in
    restart)
        restart_system "$2"
        ;;
    status)
        show_system_status
        ;;
    logs)
        show_logs "$2"
        ;;
    rebuild)
        rebuild_system
        ;;
    cleanup)
        cleanup_docker
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        show_help
        ;;
    *)
        echo "❌ 未知命令: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
