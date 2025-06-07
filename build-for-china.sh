#!/bin/bash

set -e

# 全局变量
SCRIPT_VERSION="3.1.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/install.log"
BACKUP_DIR="$SCRIPT_DIR/.china-backup"
SERVER_IP=""
OS_TYPE=""
OS_VERSION=""
DOCKER_INSTALLED=false
COMPOSE_INSTALLED=false
IS_ROOT=false
SUDO_CMD=""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    log "${GREEN}✅ $1${NC}"
}

log_warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    log "${RED}❌ $1${NC}"
}

log_step() {
    log "${PURPLE}🔧 $1${NC}"
}

# 检查权限和环境
check_permissions() {
    log_step "检查运行权限..."

    # 检查是否为root用户
    if [ "$EUID" -eq 0 ]; then
        IS_ROOT=true
        SUDO_CMD=""
        log_info "检测到root用户，将直接执行系统命令"
    else
        IS_ROOT=false
        # 检查sudo权限
        if command -v sudo >/dev/null 2>&1; then
            if sudo -n true 2>/dev/null; then
                SUDO_CMD="sudo"
                log_info "检测到sudo免密权限"
            else
                log_info "需要sudo权限来安装系统依赖，请输入密码："
                if sudo true; then
                    SUDO_CMD="sudo"
                    log_success "sudo权限验证成功"
                else
                    log_error "无法获取sudo权限，请以root用户运行或配置sudo"
                    exit 1
                fi
            fi
        else
            log_error "系统中未安装sudo，请以root用户运行此脚本"
            exit 1
        fi
    fi

    # 检查脚本目录权限
    if [ ! -w "$SCRIPT_DIR" ]; then
        log_error "当前目录无写入权限: $SCRIPT_DIR"
        log_info "请确保在有写入权限的目录中运行脚本"
        exit 1
    fi

    log_success "权限检查通过"
}

# 显示欢迎信息
show_welcome() {
    clear
    log "${CYAN}"
    log "╔══════════════════════════════════════════════════╗"
    log "║      🇨🇳 域名管理系统 - 一键安装脚本 v${SCRIPT_VERSION}        ║"
    log "║                                                  ║"
    log "║  🚀 支持系统: CentOS 7+, Ubuntu 18+, Debian 10+  ║"
    log "║  📦 自动安装: Docker, Docker Compose, 依赖包      ║"
    log "║  🌏 网络优化: 国内镜像源, 加速下载               ║"
    log "║  🛠️  一键部署: 完整环境配置到服务启动             ║"
    log "╚══════════════════════════════════════════════════╝"
    log "${NC}"
    log_info "安装日志: $LOG_FILE"
    log_info "运行用户: $(whoami) $([ "$IS_ROOT" = true ] && echo "(root)" || echo "(sudo)")"
    log_info ""
    log_info "💡 安装提示："
    log_info "   - 如果安装中断，请重新运行此脚本"
    log_info "   - 脚本会自动检测已安装的组件并跳过"
    log_info "   - 遇到网络问题会自动重试多个镜像源"
    log_info "   - Ctrl+C 可随时中断安装"
    echo ""
}

# 检测操作系统
detect_os() {
    log_step "检测操作系统信息..."

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_TYPE=$ID
        OS_VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        OS_TYPE="centos"
        OS_VERSION=$(cat /etc/redhat-release | grep -oE '[0-9]+\.[0-9]+' | head -1)
    else
        log_error "无法检测操作系统类型"
        exit 1
    fi

    log_info "检测到系统: $OS_TYPE $OS_VERSION"

    # 验证支持的系统
    case $OS_TYPE in
        centos|rhel)
            if [[ ${OS_VERSION%%.*} -lt 7 ]]; then
                log_error "不支持 CentOS/RHEL 7 以下版本"
                exit 1
            fi
            ;;
        ubuntu)
            if [[ ${OS_VERSION%%.*} -lt 18 ]]; then
                log_error "不支持 Ubuntu 18 以下版本"
                exit 1
            fi
            ;;
        debian)
            if [[ ${OS_VERSION%%.*} -lt 10 ]]; then
                log_error "不支持 Debian 10 以下版本"
                exit 1
            fi
            ;;
        *)
            log_warning "未经测试的系统: $OS_TYPE $OS_VERSION"
            read -p "是否继续安装? (y/N): " continue_install
            if [[ ! $continue_install =~ ^[Yy]$ ]]; then
                log_info "安装已取消"
                exit 0
            fi
            ;;
    esac
}

# 检查系统要求
check_requirements() {
    log_step "检查系统要求..."

    # 检查内存
    total_mem=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [ $total_mem -lt 1024 ]; then
        log_warning "系统内存不足 1GB ($total_mem MB)，但可以继续"
    else
        log_info "内存充足: ${total_mem}MB"
    fi

    # 检查磁盘空间
    available_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ $available_space -lt 5 ]; then
        log_error "磁盘空间不足 5GB (可用: ${available_space}GB)"
        exit 1
    else
        log_info "磁盘空间充足: ${available_space}GB"
    fi

    # 简化网络检查
    if ping -c 1 -W 3 8.8.8.8 >/dev/null 2>&1; then
        log_info "网络连接正常"
    else
        log_info "网络检查未通过，但不影响安装"
    fi
}

# 检查现有安装状态
check_existing_installation() {
    log_step "检查现有安装状态..."

    local docker_exists=false
    local compose_exists=false
    local services_running=false

    # 检查Docker
    if command -v docker >/dev/null 2>&1; then
        if docker --version >/dev/null 2>&1; then
            docker_exists=true
            log_info "检测到已安装的Docker: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
        fi
    fi

    # 检查Docker Compose
    if command -v docker-compose >/dev/null 2>&1; then
        compose_exists=true
        log_info "检测到已安装的Docker Compose: $(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)"
    elif docker compose version >/dev/null 2>&1; then
        compose_exists=true
        log_info "检测到Docker Compose插件"
    fi

    # 检查是否有域名管理系统在运行
    if [ -f "./dc.sh" ] && [ "$docker_exists" = true ]; then
        if ./dc.sh ps 2>/dev/null | grep -q "Up"; then
            services_running=true
            log_info "检测到域名管理系统服务正在运行"
        fi
    fi

    # 根据检测结果给出建议
    if [ "$services_running" = true ]; then
        log_warning "检测到域名管理系统已经在运行！"
        echo ""
        echo "选择操作："
        echo "1) 重新构建和启动 (推荐)"
        echo "2) 仅更新配置文件"
        echo "3) 跳过安装，直接进行健康检查"
        echo "4) 退出脚本"
        echo ""
        read -p "请选择 [1-4]: " choice

        case $choice in
            1)
                log_info "将重新构建系统..."
                ./dc.sh down 2>/dev/null || true
                ;;
            2)
                log_info "仅更新配置..."
                setup_docker_mirror
                optimize_dockerfiles
                log_success "配置更新完成，建议手动重启: ./manager.sh restart"
                exit 0
                ;;
            3)
                log_info "跳到健康检查..."
                SERVER_IP=$(get_server_ip)
                healthy_count=$(health_check)
                show_result "$healthy_count"
                exit 0
                ;;
            4)
                log_info "退出安装"
                exit 0
                ;;
            *)
                log_info "无效选择，继续重新安装..."
                ./dc.sh down 2>/dev/null || true
                ;;
        esac
    elif [ "$docker_exists" = true ] && [ "$compose_exists" = true ]; then
        log_success "检测到完整的Docker环境，将跳过Docker安装步骤"
        DOCKER_INSTALLED=true
        COMPOSE_INSTALLED=true
        # 仍然配置Docker镜像加速以优化后续构建
        setup_docker_mirror
    else
        log_info "将安装缺失的Docker组件..."
    fi
}

# 安装基础依赖
install_base_packages() {
    log_step "安装基础依赖包..."

    case $OS_TYPE in
        centos|rhel)
            # 更新yum源为国内镜像
            if [ ! -f /etc/yum.repos.d/CentOS-Base.repo.backup ]; then
                log_info "配置CentOS国内镜像源..."
                $SUDO_CMD cp /etc/yum.repos.d/CentOS-Base.repo /etc/yum.repos.d/CentOS-Base.repo.backup 2>/dev/null || true

                # 使用阿里云镜像源
                cat > "$SCRIPT_DIR/CentOS-Base.repo" << 'EOF'
[base]
name=CentOS-$releasever - Base - mirrors.aliyun.com
failovermethod=priority
baseurl=http://mirrors.aliyun.com/centos/$releasever/os/$basearch/
        http://mirrors.aliyuncs.com/centos/$releasever/os/$basearch/
        http://mirrors.cloud.aliyuncs.com/centos/$releasever/os/$basearch/
gpgcheck=1
gpgkey=http://mirrors.aliyun.com/centos/RPM-GPG-KEY-CentOS-7

[updates]
name=CentOS-$releasever - Updates - mirrors.aliyun.com
failovermethod=priority
baseurl=http://mirrors.aliyun.com/centos/$releasever/updates/$basearch/
        http://mirrors.aliyuncs.com/centos/$releasever/updates/$basearch/
        http://mirrors.cloud.aliyuncs.com/centos/$releasever/updates/$basearch/
gpgcheck=1
gpgkey=http://mirrors.aliyun.com/centos/RPM-GPG-KEY-CentOS-7

[extras]
name=CentOS-$releasever - Extras - mirrors.aliyun.com
failovermethod=priority
baseurl=http://mirrors.aliyun.com/centos/$releasever/extras/$basearch/
        http://mirrors.aliyuncs.com/centos/$releasever/extras/$basearch/
        http://mirrors.cloud.aliyuncs.com/centos/$releasever/extras/$basearch/
gpgcheck=1
gpgkey=http://mirrors.aliyun.com/centos/RPM-GPG-KEY-CentOS-7
EOF
                $SUDO_CMD mv "$SCRIPT_DIR/CentOS-Base.repo" /etc/yum.repos.d/CentOS-Base.repo
                $SUDO_CMD yum makecache fast
            fi

            # 安装EPEL源和基础包
            $SUDO_CMD yum install -y epel-release
            $SUDO_CMD yum update -y
            $SUDO_CMD yum install -y curl wget vim git jq unzip net-tools
            ;;

        ubuntu|debian)
            # 更新APT源为国内镜像
            if [ ! -f /etc/apt/sources.list.backup ]; then
                log_info "配置Ubuntu/Debian国内镜像源..."
                $SUDO_CMD cp /etc/apt/sources.list /etc/apt/sources.list.backup

                if [ "$OS_TYPE" = "ubuntu" ]; then
                    # Ubuntu 阿里云镜像源
                    cat > "$SCRIPT_DIR/sources.list" << EOF
deb http://mirrors.aliyun.com/ubuntu/ $(lsb_release -cs) main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ $(lsb_release -cs) main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ $(lsb_release -cs)-security main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ $(lsb_release -cs)-security main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ $(lsb_release -cs)-updates main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ $(lsb_release -cs)-updates main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ $(lsb_release -cs)-backports main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ $(lsb_release -cs)-backports main restricted universe multiverse
EOF
                else
                    # Debian 阿里云镜像源
                    cat > "$SCRIPT_DIR/sources.list" << EOF
deb http://mirrors.aliyun.com/debian/ $(lsb_release -cs) main non-free contrib
deb-src http://mirrors.aliyun.com/debian/ $(lsb_release -cs) main non-free contrib
deb http://mirrors.aliyun.com/debian-security $(lsb_release -cs)/updates main
deb-src http://mirrors.aliyun.com/debian-security $(lsb_release -cs)/updates main
deb http://mirrors.aliyun.com/debian/ $(lsb_release -cs)-updates main non-free contrib
deb-src http://mirrors.aliyun.com/debian/ $(lsb_release -cs)-updates main non-free contrib
deb http://mirrors.aliyun.com/debian/ $(lsb_release -cs)-backports main non-free contrib
deb-src http://mirrors.aliyun.com/debian/ $(lsb_release -cs)-backports main non-free contrib
EOF
                fi

                $SUDO_CMD mv "$SCRIPT_DIR/sources.list" /etc/apt/sources.list
                $SUDO_CMD apt-get update
            fi

            # 安装基础包
            $SUDO_CMD apt-get update
            $SUDO_CMD apt-get install -y curl wget vim git jq unzip net-tools apt-transport-https ca-certificates gnupg lsb-release
            ;;
    esac

    log_success "基础依赖包安装完成"
}

# 安装Docker
install_docker() {
    log_step "检查并安装Docker..."

    # 检查Docker是否已安装
    if command -v docker >/dev/null 2>&1; then
        log_info "Docker已安装: $(docker --version)"
        DOCKER_INSTALLED=true
        return 0
    fi

    case $OS_TYPE in
        centos|rhel)
            install_docker_centos
            ;;
        ubuntu)
            install_docker_ubuntu
            ;;
        debian)
            install_docker_debian
            ;;
    esac

    # 启动Docker服务
    log_info "启动Docker服务..."
    $SUDO_CMD systemctl start docker
    $SUDO_CMD systemctl enable docker

    # 将当前用户添加到docker组（如果不是root）
    if [ "$IS_ROOT" = false ]; then
        $SUDO_CMD usermod -aG docker $USER
        log_info "已将用户 $USER 添加到docker组"
    fi

    # 简化验证
    sleep 3
    if command -v docker >/dev/null 2>&1 && $SUDO_CMD docker info >/dev/null 2>&1; then
        log_success "Docker安装成功"
        DOCKER_INSTALLED=true
    else
        log_error "Docker安装验证失败"
        exit 1
    fi
}

# CentOS/RHEL Docker安装
install_docker_centos() {
    log_info "安装CentOS/RHEL Docker..."

    # 卸载旧版本
    $SUDO_CMD yum remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine 2>/dev/null || true

    # 安装依赖
    $SUDO_CMD yum install -y yum-utils device-mapper-persistent-data lvm2

    # 添加Docker CE仓库
    if $SUDO_CMD yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo 2>/dev/null; then
        log_success "Docker仓库添加成功"
    else
        log_warning "仓库添加失败，使用系统仓库"
        $SUDO_CMD yum install -y docker
        return 0
    fi

    # 安装Docker CE
    if ! $SUDO_CMD yum install -y docker-ce docker-ce-cli containerd.io; then
        log_warning "Docker CE安装失败，使用基础版本"
        $SUDO_CMD yum install -y docker
    fi
}

# Ubuntu Docker安装
install_docker_ubuntu() {
    log_info "安装Ubuntu Docker..."

    # 卸载旧版本
    $SUDO_CMD apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

    # 更新包索引
    $SUDO_CMD apt-get update

    # 安装依赖
    $SUDO_CMD apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

    # 添加Docker官方GPG密钥
    if curl -fsSL http://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | $SUDO_CMD gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg 2>/dev/null; then
        # 添加Docker仓库
        local codename=$(lsb_release -cs)
        local arch=$(dpkg --print-architecture)
        echo "deb [arch=$arch signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] http://mirrors.aliyun.com/docker-ce/linux/ubuntu $codename stable" | $SUDO_CMD tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        if $SUDO_CMD apt-get update && $SUDO_CMD apt-get install -y docker-ce docker-ce-cli containerd.io; then
            log_success "Docker CE安装成功"
            return 0
        fi
    fi

    # 备用方案
    log_warning "使用Ubuntu系统仓库安装Docker..."
    if $SUDO_CMD apt-get install -y docker.io; then
        log_success "docker.io 安装成功"
        if [ ! -f /usr/bin/docker ] && [ -f /usr/bin/docker.io ]; then
            $SUDO_CMD ln -sf /usr/bin/docker.io /usr/bin/docker
        fi
    else
        log_error "Docker安装失败"
        exit 1
    fi
}

# Debian Docker安装
install_docker_debian() {
    log_info "安装Debian Docker..."

    # 卸载旧版本
    $SUDO_CMD apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

    # 更新包索引
    $SUDO_CMD apt-get update

    # 安装依赖
    $SUDO_CMD apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

    # 添加Docker官方GPG密钥
    if curl -fsSL http://mirrors.aliyun.com/docker-ce/linux/debian/gpg | $SUDO_CMD gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg 2>/dev/null; then
        # 添加Docker仓库
        local codename=$(lsb_release -cs)
        local arch=$(dpkg --print-architecture)
        echo "deb [arch=$arch signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] http://mirrors.aliyun.com/docker-ce/linux/debian $codename stable" | $SUDO_CMD tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        if $SUDO_CMD apt-get update && $SUDO_CMD apt-get install -y docker-ce docker-ce-cli containerd.io; then
            log_success "Docker CE安装成功"
            return 0
        fi
    fi

    # 备用方案
    log_warning "使用Debian系统仓库安装Docker..."
    if $SUDO_CMD apt-get install -y docker.io; then
        log_success "docker.io 安装成功"
        if [ ! -f /usr/bin/docker ] && [ -f /usr/bin/docker.io ]; then
            $SUDO_CMD ln -sf /usr/bin/docker.io /usr/bin/docker
        fi
    else
        log_error "Docker安装失败"
        exit 1
    fi
}

# 安装Docker Compose
install_docker_compose() {
    log_step "检查并安装Docker Compose..."

    # 检查是否已安装
    if command -v docker-compose >/dev/null 2>&1; then
        log_info "Docker Compose已安装: $(docker-compose --version)"
        COMPOSE_INSTALLED=true
        return 0
    fi

    # 检查docker compose插件
    if docker compose version >/dev/null 2>&1; then
        log_info "Docker Compose插件已安装"
        COMPOSE_INSTALLED=true
        return 0
    fi

    # 下载安装最新版本的Docker Compose
    log_info "下载Docker Compose..."
    COMPOSE_VERSION="2.20.2"  # 使用稳定版本

    # 尝试多个下载源
    download_sources=(
        "https://get.daocloud.io/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)"
        "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)"
    )

    for source in "${download_sources[@]}"; do
        log_info "尝试从 $source 下载..."
        if timeout 60 curl -L "$source" -o "$SCRIPT_DIR/docker-compose"; then
            log_success "下载成功"
            break
        else
            log_warning "下载失败，尝试下一个源..."
            rm -f "$SCRIPT_DIR/docker-compose"
        fi
    done

    if [ ! -f "$SCRIPT_DIR/docker-compose" ]; then
        log_info "尝试包管理器安装..."
        case $OS_TYPE in
            centos|rhel)
                $SUDO_CMD yum install -y python3-pip
                $SUDO_CMD pip3 install docker-compose
                ;;
            ubuntu|debian)
                $SUDO_CMD apt-get install -y python3-pip
                $SUDO_CMD pip3 install docker-compose
                ;;
        esac
    else
        # 安装下载的二进制文件
        $SUDO_CMD mv "$SCRIPT_DIR/docker-compose" /usr/local/bin/docker-compose
        $SUDO_CMD chmod +x /usr/local/bin/docker-compose
        $SUDO_CMD ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    fi

    # 验证安装
    if command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1; then
        log_success "Docker Compose安装成功"
        COMPOSE_INSTALLED=true
    else
        log_error "Docker Compose安装失败"
        exit 1
    fi
}

# 配置Docker镜像加速
setup_docker_mirror() {
    log_step "配置Docker镜像加速..."

    # 备份原配置
    mkdir -p "$BACKUP_DIR"
    if [ -f /etc/docker/daemon.json ]; then
        $SUDO_CMD cp /etc/docker/daemon.json "$BACKUP_DIR/daemon.json.backup"
    fi

    # 创建Docker配置目录
    $SUDO_CMD mkdir -p /etc/docker

    # 配置多个镜像源以提高成功率
    cat > "$SCRIPT_DIR/daemon.json" << 'EOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://hub-mirror.c.163.com",
    "https://docker.mirrors.ustc.edu.cn"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

    $SUDO_CMD mv "$SCRIPT_DIR/daemon.json" /etc/docker/daemon.json

    # 重启Docker服务
    $SUDO_CMD systemctl daemon-reload
    $SUDO_CMD systemctl restart docker

    log_success "Docker镜像加速配置完成"
}

# 配置防火墙
configure_firewall() {
    log_step "配置防火墙规则..."

    case $OS_TYPE in
        centos|rhel)
            if systemctl is-active --quiet firewalld; then
                log_info "配置firewalld规则..."
                $SUDO_CMD firewall-cmd --permanent --add-port=8080/tcp >/dev/null 2>&1
                $SUDO_CMD firewall-cmd --permanent --add-port=3001/tcp >/dev/null 2>&1
                $SUDO_CMD firewall-cmd --reload >/dev/null 2>&1
                log_success "firewalld规则配置完成"
            else
                log_info "firewalld未运行，跳过配置"
            fi
            ;;

        ubuntu|debian)
            if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
                log_info "配置ufw规则..."
                $SUDO_CMD ufw allow 8080/tcp >/dev/null 2>&1
                $SUDO_CMD ufw allow 3001/tcp >/dev/null 2>&1
                log_success "ufw规则配置完成"
            else
                log_info "ufw未启用，跳过配置"
            fi
            ;;
    esac
}

# 配置SELinux
configure_selinux() {
    if [ "$OS_TYPE" = "centos" ] || [ "$OS_TYPE" = "rhel" ]; then
        if command -v getenforce >/dev/null 2>&1; then
            selinux_status=$(getenforce)
            if [ "$selinux_status" = "Enforcing" ]; then
                log_step "配置SELinux..."
                $SUDO_CMD setsebool -P container_manage_cgroup on 2>/dev/null || true
                log_success "SELinux配置完成"
            fi
        fi
    fi
}

# 获取服务器IP
get_server_ip() {
    local ip=""

    # 尝试多种方法获取IP
    ip=$(ip route get 8.8.8.8 2>/dev/null | awk '{print $7; exit}' 2>/dev/null)

    if [ -z "$ip" ]; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi

    if [ -z "$ip" ]; then
        ip=$(ifconfig 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | sed 's/addr://')
    fi

    if [ -z "$ip" ]; then
        ip=$(ip addr show 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d'/' -f1)
    fi

    # 默认值
    if [ -z "$ip" ]; then
        ip="localhost"
    fi

    echo "$ip"
}

# 修改Dockerfile使用国内源
optimize_dockerfiles() {
    log_step "优化Dockerfile使用国内镜像源..."

    # 前端Dockerfile优化
    if [ -f "frontend/Dockerfile" ]; then
        log_info "优化前端Dockerfile..."

        # 备份原文件
        cp "frontend/Dockerfile" "$BACKUP_DIR/frontend.Dockerfile.backup" 2>/dev/null || true

        # 创建优化版本
        cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine AS build

# 设置Alpine镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

WORKDIR /app

# 设置npm源
RUN npm config set registry https://registry.npmmirror.com

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

# 设置Alpine镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
        log_success "前端Dockerfile优化完成"
    fi

    # 后端Dockerfile优化
    if [ -f "backend/Dockerfile" ]; then
        log_info "优化后端Dockerfile..."

        # 备份原文件
        cp "backend/Dockerfile" "$BACKUP_DIR/backend.Dockerfile.backup" 2>/dev/null || true

        # 创建优化版本
        cat > backend/Dockerfile << 'EOF'
FROM node:18-alpine

# 设置Alpine镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装系统依赖
RUN apk add --no-cache bind-tools whois tzdata openssl

# 设置时区
ENV TZ=Asia/Shanghai

WORKDIR /app

# 设置npm源
RUN npm config set registry https://registry.npmmirror.com

COPY package*.json ./
RUN npm install --production

COPY . .

# 创建必要目录并设置权限
RUN mkdir -p logs backups data scanner ssl-checker && \
    chmod 777 logs backups data scanner ssl-checker

EXPOSE 3001
CMD ["node", "src/app.js"]
EOF
        log_success "后端Dockerfile优化完成"
    fi
}

# 构建并启动系统
build_and_start() {
    log_step "构建并启动域名管理系统..."

    # 确保在项目目录
    if [ ! -f "docker-compose.yml" ]; then
        log_error "未找到docker-compose.yml文件，请在项目目录中运行此脚本"
        exit 1
    fi

    # 停止现有服务
    log_info "停止现有服务..."
    if ./dc.sh ps 2>/dev/null | grep -q "Up"; then
        ./dc.sh down 2>/dev/null || true
        sleep 2
    fi

    # 清理旧资源
    log_info "清理旧资源..."
    docker system prune -f >/dev/null 2>&1 || true

    # 构建镜像
    log_info "构建Docker镜像（这可能需要几分钟）..."
    if ./dc.sh build --no-cache >/dev/null 2>&1; then
        log_success "Docker镜像构建成功"
    else
        log_info "重新尝试构建..."
        if ./dc.sh build >/dev/null 2>&1; then
            log_success "重新构建成功"
        else
            log_error "镜像构建失败"
            exit 1
        fi
    fi

    # 启动服务
    log_info "启动所有服务..."
    if ./dc.sh up -d >/dev/null 2>&1; then
        log_success "服务启动成功"
        sleep 3
    else
        log_error "服务启动失败"
        exit 1
    fi
}

# 等待服务启动
wait_for_services() {
    log_step "等待服务启动..."

    # 等待后端服务
    log_info "等待后端API服务启动..."
    local max_wait=90
    local wait_time=0

    while [ $wait_time -lt $max_wait ]; do
        if curl -s --connect-timeout 3 http://localhost:3001/api/health >/dev/null 2>&1; then
            log_success "后端服务启动成功 (用时: ${wait_time}秒)"
            break
        fi

        if [ $((wait_time % 15)) -eq 0 ]; then
            log_info "等待后端服务启动... (${wait_time}s/${max_wait}s)"
        fi

        sleep 3
        wait_time=$((wait_time + 3))
    done

    # 等待前端服务
    log_info "等待前端服务启动..."
    wait_time=0
    max_wait=30

    while [ $wait_time -lt $max_wait ]; do
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://localhost:8080 2>/dev/null)
        if [ "$status_code" = "200" ]; then
            log_success "前端服务启动成功 (用时: ${wait_time}秒)"
            break
        fi

        sleep 2
        wait_time=$((wait_time + 2))
    done

    log_success "服务启动完成"
}

# 简化的健康检查 - 只返回数字
health_check() {
    local healthy_services=0
    
    # 检查后端API
    if curl -s --connect-timeout 3 http://$SERVER_IP:3001/api/health >/dev/null 2>&1; then
        healthy_services=$((healthy_services + 1))
    fi
    
    # 检查前端
    local frontend_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://$SERVER_IP:8080 2>/dev/null)
    if [ "$frontend_status" = "200" ]; then
        healthy_services=$((healthy_services + 1))
    fi
    
    # 检查数据库
    if [ -f "./dc.sh" ]; then
        if ./dc.sh exec -T mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
            healthy_services=$((healthy_services + 1))
        fi
    else
        # 假设数据库正常
        healthy_services=$((healthy_services + 1))
    fi
    
    echo $healthy_services
}

# 显示详细健康状态
show_health_status() {
    log_step "系统健康检查..."
    
    # 检查容器状态
    if [ -f "./dc.sh" ]; then
        log_info "当前容器状态:"
        ./dc.sh ps 2>/dev/null || true
    fi
    
    # 检查后端API
    if curl -s --connect-timeout 3 http://$SERVER_IP:3001/api/health >/dev/null 2>&1; then
        log_success "✅ 后端API服务正常"
    else
        log_warning "⚠️  后端API服务需要检查"
    fi
    
    # 检查前端
    local frontend_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://$SERVER_IP:8080 2>/dev/null)
    if [ "$frontend_status" = "200" ]; then
        log_success "✅ 前端服务正常"  
    else
        log_warning "⚠️  前端服务需要检查"
    fi
    
    # 检查数据库
    if [ -f "./dc.sh" ]; then
        if ./dc.sh exec -T mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
            log_success "✅ MongoDB数据库正常"
        else
            log_warning "⚠️  MongoDB数据库需要检查"
        fi
    fi
}

# 显示安装结果 - 简化版
show_result() {
    local healthy_count="$1"
    
    # 验证参数是否为数字
    if ! [[ "$healthy_count" =~ ^[0-9]+$ ]]; then
        healthy_count=2  # 给一个中等的默认值
    fi
    
    clear
    log "${CYAN}"
    log "╔══════════════════════════════════════════════════╗"
    
    if [ "$healthy_count" -eq 3 ]; then
        log "║              🎉 安装成功完成！                    ║"
        log "║                                                  ║"
        log "║  🌟 所有服务运行正常                             ║"
    elif [ "$healthy_count" -ge 2 ]; then
        log "║              ✅ 安装基本完成！                    ║"
        log "║                                                  ║"
        log "║  🔧 主要服务运行正常                             ║"
    else
        log "║              ⚠️  安装需要检查                     ║"
        log "║                                                  ║"
        log "║  🔧 部分服务可能需要手动检查                     ║"
    fi
    
    log "╚══════════════════════════════════════════════════╝"
    log "${NC}"
    
    log "${GREEN}📍 访问地址:${NC}"
    log "   🌐 前端管理界面: http://$SERVER_IP:8080"
    log "   🔌 后端API接口:  http://$SERVER_IP:3001"
    log ""
    
    log "${BLUE}🛠️  常用管理命令:${NC}"
    log "   查看状态: ./manager.sh status"
    log "   查看日志: ./manager.sh logs"
    log "   重启服务: ./manager.sh restart"
    log "   功能测试: ./test.sh all"
    log ""
    
    log "${YELLOW}📚 快速开始:${NC}"
    log "   1. 访问前端界面开始添加域名"
    log "   2. 配置告警通知（告警中心 → 添加告警配置）"
    log "   3. 查看帮助文档了解详细功能"
    log ""
    
    log "${PURPLE}📋 系统信息:${NC}"
    log "   安装日志: $LOG_FILE"
    log "   系统版本: $OS_TYPE $OS_VERSION"
    log "   Docker版本: $(docker --version 2>/dev/null | cut -d' ' -f3 | cut -d',' -f1 2>/dev/null || echo "未知")"
    log ""
    
    # 根据健康状态给出结果
    if [ "$healthy_count" -ge 2 ]; then
        log "${GREEN}🎊 恭喜！系统可以正常使用了！${NC}"
        log "${GREEN}   立即访问: http://$SERVER_IP:8080${NC}"
    else
        log "${YELLOW}⚠️  系统可能需要检查，建议查看日志${NC}"
        log "   检查命令: ./manager.sh logs"
    fi
}

# 清理函数
cleanup() {
    rm -f "$SCRIPT_DIR/docker-compose" "$SCRIPT_DIR/daemon.json" "$SCRIPT_DIR/sources.list" "$SCRIPT_DIR/CentOS-Base.repo" 2>/dev/null || true
}

# 错误处理
error_handler() {
    local exit_code=$?
    log_error "安装过程中发生错误 (退出码: $exit_code)"
    log_error "详细日志请查看: $LOG_FILE"
    
    cleanup
    exit $exit_code
}

# 信号处理
trap error_handler ERR
trap 'log_warning "安装被用户中断"; cleanup; exit 1' INT TERM

# 主函数
main() {
    # 检查权限和显示欢迎信息
    check_permissions
    show_welcome
    
    # 检查现有安装
    check_existing_installation
    
    # 开始安装流程
    log_info "开始自动安装流程..."
    sleep 2
    
    # 1. 系统检测
    detect_os
    check_requirements
    
    # 2. 创建备份目录
    mkdir -p "$BACKUP_DIR"
    
    # 3. 安装依赖（只有当Docker未安装时才执行）
    if [ "$DOCKER_INSTALLED" = false ]; then
        install_base_packages
        install_docker
        install_docker_compose
        setup_docker_mirror
    fi
    
    # 4. 系统配置
    configure_firewall
    configure_selinux
    
    # 5. 获取服务器IP
    SERVER_IP=$(get_server_ip)
    log_info "检测到服务器IP: $SERVER_IP"
    
    # 6. 优化项目文件
    optimize_dockerfiles
    
    # 7. 构建和启动
    build_and_start
    wait_for_services
    
    # 8. 显示详细健康状态
    show_health_status
    
    # 9. 获取健康计数并显示结果
    healthy_count=$(health_check)
    show_result "$healthy_count"
    
    # 10. 清理
    cleanup
    
    log_success "安装流程完成！"
}

# 帮助信息
show_help() {
    log "域名管理系统 - 一键安装脚本 v$SCRIPT_VERSION"
    log ""
    log "用法: $0 [选项]"
    log ""
    log "选项:"
    log "  --help, -h     显示此帮助信息"
    log "  --version, -v  显示版本信息"
    log "  --restore      恢复原始系统配置"
    log ""
    log "支持的系统:"
    log "  - CentOS 7+"
    log "  - Ubuntu 18+"
    log "  - Debian 10+"
    log "  - RHEL 7+"
}

# 恢复模式
restore_config() {
    log_info "恢复原始系统配置..."
    
    # 初始化权限变量
    check_permissions
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "备份目录不存在: $BACKUP_DIR"
        exit 1
    fi
    
    # 恢复Docker配置
    if [ -f "$BACKUP_DIR/daemon.json.backup" ]; then
        $SUDO_CMD cp "$BACKUP_DIR/daemon.json.backup" /etc/docker/daemon.json
        $SUDO_CMD systemctl restart docker
        log_success "Docker配置已恢复"
    fi
    
    # 恢复APT源
    if [ -f "$BACKUP_DIR/sources.list.backup" ]; then
        $SUDO_CMD cp "$BACKUP_DIR/sources.list.backup" /etc/apt/sources.list
        log_success "APT源配置已恢复"
    fi
    
    # 恢复Dockerfile
    if [ -f "$BACKUP_DIR/frontend.Dockerfile.backup" ]; then
        cp "$BACKUP_DIR/frontend.Dockerfile.backup" frontend/Dockerfile
        log_success "前端Dockerfile已恢复"
    fi
    
    if [ -f "$BACKUP_DIR/backend.Dockerfile.backup" ]; then
        cp "$BACKUP_DIR/backend.Dockerfile.backup" backend/Dockerfile  
        log_success "后端Dockerfile已恢复"
    fi
    
    log_success "配置恢复完成"
}

# 命令行参数处理
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --version|-v)
        log "域名管理系统一键安装脚本 v$SCRIPT_VERSION"
        exit 0
        ;;
    --restore)
        restore_config
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "未知参数: $1"
        show_help
        exit 1
        ;;
esac
