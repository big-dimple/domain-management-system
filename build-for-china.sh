#!/bin/bash

set -e

echo "🇨🇳 域名管理系统 - 中国大陆服务器优化脚本"
echo "============================================"

# 检查是否为root用户或有sudo权限
check_permissions() {
    if [ "$EUID" -eq 0 ]; then
        SUDO_CMD=""
    elif command -v sudo >/dev/null 2>&1; then
        SUDO_CMD="sudo"
        echo "ℹ️  需要sudo权限来配置Docker镜像加速"
    else
        echo "❌ 需要root权限或sudo来配置Docker镜像加速"
        echo "💡 可以手动配置后再运行普通启动: ./start.sh"
        exit 1
    fi
}

# 备份原始文件
backup_files() {
    echo "📦 备份原始配置文件..."
    
    # 创建备份目录
    mkdir -p .china-backup
    
    # 备份Dockerfile
    [ -f "frontend/Dockerfile" ] && cp "frontend/Dockerfile" ".china-backup/frontend.Dockerfile.backup"
    [ -f "backend/Dockerfile" ] && cp "backend/Dockerfile" ".china-backup/backend.Dockerfile.backup"
    
    # 备份Docker daemon配置
    if [ -f "/etc/docker/daemon.json" ]; then
        $SUDO_CMD cp "/etc/docker/daemon.json" ".china-backup/daemon.json.backup"
    fi
    
    echo "✅ 备份完成 (备份文件保存在 .china-backup 目录)"
}

# 恢复原始文件
restore_files() {
    echo "🔄 恢复原始配置文件..."
    
    [ -f ".china-backup/frontend.Dockerfile.backup" ] && \
        mv ".china-backup/frontend.Dockerfile.backup" "frontend/Dockerfile"
    [ -f ".china-backup/backend.Dockerfile.backup" ] && \
        mv ".china-backup/backend.Dockerfile.backup" "backend/Dockerfile"
    
    if [ -f ".china-backup/daemon.json.backup" ]; then
        $SUDO_CMD mv ".china-backup/daemon.json.backup" "/etc/docker/daemon.json"
        $SUDO_CMD systemctl restart docker
    fi
    
    echo "✅ 恢复完成"
}

# 获取服务器IP地址
get_server_ip() {
    local ip=""
    
    # 方法1: hostname -I
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    
    # 方法2: ip route (如果方法1失败)
    if [ -z "$ip" ]; then
        ip=$(ip route get 8.8.8.8 2>/dev/null | awk '{print $7; exit}')
    fi
    
    # 方法3: 网卡信息
    if [ -z "$ip" ]; then
        ip=$(ip addr show 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d'/' -f1)
    fi
    
    # 方法4: 从网卡获取
    if [ -z "$ip" ]; then
        ip=$(ifconfig 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | sed 's/addr://')
    fi
    
    # 默认值
    if [ -z "$ip" ]; then
        ip="localhost"
    fi
    
    echo "$ip"
}

# 配置 Docker 镜像加速
setup_docker_mirror() {
    local provider=$1
    local daemon_file="/etc/docker/daemon.json"
    
    case $provider in
        1)
            mirror="https://mirror.ccs.tencentyun.com"
            provider_name="腾讯云"
            ;;
        2)
            read -p "请输入阿里云镜像加速地址（从控制台获取）: " mirror
            provider_name="阿里云"
            if [ -z "$mirror" ]; then
                echo "❌ 地址不能为空"
                return 1
            fi
            ;;
        3)
            read -p "请输入华为云镜像加速地址（从控制台获取）: " mirror
            provider_name="华为云"
            if [ -z "$mirror" ]; then
                echo "❌ 地址不能为空"
                return 1
            fi
            ;;
        4)
            echo "⚠️  火山引擎镜像仓库需要付费开通，免费用户无法使用"
            echo "    建议选择腾讯云或阿里云免费方案"
            echo ""
            read -p "如已开通付费服务，请输入您的镜像加速地址（回车跳过）: " mirror
            if [ -z "$mirror" ]; then
                echo "⏭️  跳过火山引擎配置，建议选择其他选项"
                return 0
            fi
            provider_name="火山引擎"
            ;;
        5)
            echo ""
            echo "💡 其他IDC/自建方案建议："
            echo "   1. 腾讯云轻量服务器搭建反向代理"
            echo "   2. 自建Nginx: proxy_pass https://registry-1.docker.io"
            echo "   3. 公共镜像: https://dockerhub.azk8s.cn"
            echo ""
            read -p "输入自定义镜像地址（回车跳过）: " mirror
            if [ -z "$mirror" ]; then
                echo "⏭️  跳过自定义配置"
                return 0
            fi
            provider_name="自定义"
            ;;
        6)
            echo "💡 跳过Docker镜像加速配置，使用默认源"
            return 0
            ;;
        *)
            echo "❌ 无效选择"
            return 1
            ;;
    esac

    echo "⚙️  配置${provider_name} Docker镜像加速: $mirror..."
    
    # 创建或更新配置文件
    if [ -f "$daemon_file" ]; then
        # 使用jq合并配置（如果可用且能正确处理）
        if command -v jq >/dev/null; then
            echo "🔧 使用jq合并镜像加速配置..."
            if $SUDO_CMD jq --arg mirror "$mirror" '.["registry-mirrors"] = [$mirror]' "$daemon_file" > "$daemon_file.tmp" 2>/dev/null; then
                $SUDO_CMD mv "$daemon_file.tmp" "$daemon_file"
            else
                echo "❌ jq处理失败，使用覆盖方式"
                echo "{
  \"registry-mirrors\": [\"$mirror\"]
}" | $SUDO_CMD tee "$daemon_file" > /dev/null
            fi
        else
            echo "⚠️  未找到jq，将覆盖原有配置"
            echo "{
  \"registry-mirrors\": [\"$mirror\"]
}" | $SUDO_CMD tee "$daemon_file" > /dev/null
        fi
    else
        # 创建新配置文件
        echo "{
  \"registry-mirrors\": [\"$mirror\"]
}" | $SUDO_CMD tee "$daemon_file" > /dev/null
    fi

    # 重启 Docker 服务
    if systemctl is-active --quiet docker; then
        echo "🔄 重启Docker服务..."
        $SUDO_CMD systemctl restart docker
        sleep 3
        
        # 验证配置
        if docker info 2>/dev/null | grep -q "$mirror"; then
            echo "✅ Docker镜像加速已配置成功"
        else
            echo "⚠️  镜像加速配置可能未完全生效，但可以继续"
        fi
    else
        echo "⚠️  Docker服务未运行，请手动启动Docker后重试"
        return 1
    fi
}

# 修改 Dockerfile 使用国内源 (更健壮的版本)
modify_dockerfiles() {
    echo "🔧 修改Dockerfile使用国内源..."
    
    # 配置前端
    if [ -f "frontend/Dockerfile" ]; then
        echo "🛠️  配置前端Dockerfile..."
        
        # 添加npm源配置
        if ! grep -q "registry.npmmirror.com" frontend/Dockerfile; then
            # 在第一个npm命令前插入
            sed -i '/npm install/ i\RUN npm config set registry https://registry.npmmirror.com' frontend/Dockerfile
        fi
        
        # 添加Alpine源配置
        if ! grep -q "mirrors.aliyun.com" frontend/Dockerfile; then
            # 在基础镜像后插入
            sed -i '/FROM nginx:alpine/a\RUN sed -i "s/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g" /etc/apk/repositories || \\\n    sed -i "s|^https://.*/|https://mirrors.aliyun.com/|g" /etc/apk/repositories' frontend/Dockerfile
        fi
    else
        echo "⚠️  前端Dockerfile不存在，跳过修改"
    fi

    # 配置后端
    if [ -f "backend/Dockerfile" ]; then
        echo "🛠️  配置后端Dockerfile..."
        
        # 添加npm源配置
        if ! grep -q "registry.npmmirror.com" backend/Dockerfile; then
            sed -i '/npm install/ i\RUN npm config set registry https://registry.npmmirror.com' backend/Dockerfile
        fi
        
        # 添加Alpine源配置
        if ! grep -q "mirrors.aliyun.com" backend/Dockerfile; then
            sed -i '/apk add/ i\RUN sed -i "s/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g" /etc/apk/repositories || \\\n    sed -i "s|^https://.*/|https://mirrors.aliyun.com/|g" /etc/apk/repositories' backend/Dockerfile
        fi
    else
        echo "⚠️  后端Dockerfile不存在，跳过修改"
    fi
    
    echo "✅ Dockerfile修改完成"
}

# 健康检查
health_check() {
    local server_ip=$1
    echo ""
    echo "🏥 健康检查："
    
    local health_check_passed=0
    
    # 检查后端API
    echo "🔍 检查后端服务..."
    for i in {1..5}; do
        if curl -s --connect-timeout 3 http://${server_ip}:3001/api/health >/dev/null 2>&1; then
            echo "✅ 后端服务健康"
            health_check_passed=$((health_check_passed + 1))
            break
        else
            echo "⏳ 等待后端服务启动... ($i/5)"
            sleep 3
        fi
    done
    
    # 检查前端
    echo "🔍 检查前端服务..."
    for i in {1..3}; do
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://${server_ip}:8080 2>/dev/null)
        if [ "$status_code" = "200" ]; then
            echo "✅ 前端服务健康"
            health_check_passed=$((health_check_passed + 1))
            break
        else
            echo "⏳ 等待前端服务启动... ($i/3)"
            sleep 2
        fi
    done
    
    if [ $health_check_passed -eq 2 ]; then
        echo "🎉 所有服务启动成功！"
        return 0
    else
        echo "⚠️  部分服务可能未正常启动，请运行 ./manage.sh status 检查"
        return 1
    fi
}

# 清理函数
cleanup() {
    echo ""
    echo "🧹 清理临时文件..."
    rm -f /etc/docker/daemon.json.tmp 2>/dev/null || true
}

# 信号处理
trap cleanup EXIT
trap 'echo ""; echo "❌ 脚本被中断"; restore_files; exit 1' INT TERM

# 主流程
main() {
    echo ""
    echo "请选择您的服务器环境："
    echo "1) 腾讯云 (推荐)"
    echo "2) 阿里云" 
    echo "3) 华为云"
    echo "4) 火山引擎 (需付费)"
    echo "5) 其他IDC/自建"
    echo "6) 跳过Docker加速配置"
    echo "7) 退出"
    
    read -p "请输入选项 [1-7]: " provider
    
    case $provider in
        7)
            echo "👋 已退出"
            exit 0
            ;;
        1|2|3|4|5|6)
            ;;
        *)
            echo "❌ 无效选择"
            exit 1
            ;;
    esac

    # 检查权限
    check_permissions
    
    # 备份文件
    backup_files
    
    # 配置Docker镜像加速
    if [ "$provider" -ne 6 ]; then
        if ! setup_docker_mirror "$provider"; then
            echo "❌ Docker配置失败"
            restore_files
            exit 1
        fi
    fi
    
    # 修改Dockerfile
    modify_dockerfiles
    
    # 停止现有服务
    echo "🛑 停止现有服务..."
    ./dc.sh down 2>/dev/null || true
    
    # 清理旧镜像
    echo "🧹 清理旧镜像..."
    docker system prune -f >/dev/null 2>&1 || true
    
    # 构建并启动服务
    echo "🚀 构建并启动服务（国内优化版）..."
    ./dc.sh up -d --build
    
    # 等待服务启动
    echo "⏳ 等待服务启动 (10秒)..."
    sleep 10
    
    # 检查服务状态
    echo ""
    echo "📊 服务状态检查："
    ./dc.sh ps
    
    # 获取本机IP
    SERVER_IP=$(get_server_ip)
    
    # 健康检查
    health_check "$SERVER_IP"
    
    echo ""
    echo "🎉 系统已成功启动！"
    echo ""
    echo "📍 访问地址："
    echo "   前端管理界面: http://${SERVER_IP}:8080"
    echo "   后端API接口: http://${SERVER_IP}:3001"
    echo ""
    echo "📚 后续操作："
    echo "   查看状态: ./manage.sh status"
    echo "   查看日志: ./manage.sh logs" 
    echo "   功能测试: ./test.sh all"
    echo ""
    echo "💡 提示: 原始配置文件已备份到 .china-backup 目录"
    echo "       如需恢复原始配置: ./$(basename "$0") --restore"
}

# 恢复模式
if [ "$1" == "--restore" ]; then
    echo "🔄 恢复原始配置模式"
    check_permissions
    restore_files
    echo "✅ 已恢复原始配置，重启Docker以生效"
    if systemctl is-active --quiet docker; then
        echo "🔄 重启Docker服务..."
        $SUDO_CMD systemctl restart docker
    fi
    exit 0
fi

# 检查必要文件
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误：未找到 docker-compose.yml"
    echo "    请在项目根目录运行此脚本"
    exit 1
fi

if [ ! -f "dc.sh" ]; then
    echo "❌ 错误：未找到 dc.sh"
    echo "    请确保在完整的项目目录中运行"
    exit 1
fi

# 检查必要命令
for cmd in docker sed; do
    if ! command -v $cmd >/dev/null; then
        echo "❌ 错误：未找到 $cmd 命令"
        echo "    请先安装Docker"
        exit 1
    fi
done

# 运行主程序
main
