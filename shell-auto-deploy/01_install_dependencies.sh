#!/bin/bash

# 域名管理系统 - 基础环境安装脚本
# 此脚本负责安装系统依赖，包括Docker和Docker Compose

# 彩色输出函数
print_green() {
    echo -e "\e[32m$1\e[0m" # 绿色输出
}

print_yellow() {
    echo -e "\e[33m$1\e[0m" # 黄色输出
}

print_red() {
    echo -e "\e[31m$1\e[0m" # 红色输出
}

print_blue() {
    echo -e "\e[34m$1\e[0m" # 蓝色输出
}

# 注意：此脚本中的 check_root 函数未被调用，因为 apt 命令会自动提示 sudo。
# 如果需要强制 root 权限运行，可以取消下一行注释。
# check_root

# 显示脚本信息
print_blue "========================================"
print_blue "    域名管理系统 - 基础环境安装脚本"
print_blue "========================================"
print_yellow "此脚本将安装以下依赖:"
echo "1. 系统更新"
echo "2. Git和其他基础工具"
echo "3. Docker"
echo "4. Docker Compose"

# 询问是否继续
# 检查是否从 13_install_all.sh 以非交互模式调用
# /tmp/domain-management-system/auto_install 文件的存在表示是由主安装脚本启动的非交互模式
if [[ "$1" == "--non-interactive" && -f /tmp/domain-management-system/auto_install ]]; then
    print_yellow "非交互模式：继续进行依赖安装。"
else
    read -p "是否继续安装? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_red "安装已取消。"
        exit 1
    fi
fi

# 安装系统依赖
print_green "步骤 1: 更新系统包列表..."
if sudo apt update; then
    print_green "系统包列表更新成功。"
else
    print_red "系统包列表更新失败，请检查网络连接或软件源配置。"
    print_red "您可以尝试手动运行 'sudo apt update' 解决问题后重试。"
    exit 1
fi

print_green "步骤 2: 安装基础工具 (git, curl, etc.)..."
if sudo apt install -y apt-transport-https ca-certificates curl software-properties-common git; then
    print_green "基础工具安装成功。"
else
    print_red "基础工具安装失败。"
    exit 1
fi

# 安装Docker
print_green "步骤 3: 安装Docker..."
if ! command -v docker &> /dev/null; then
    print_yellow "Docker 未安装，正在尝试安装..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    if sudo sh get-docker.sh; then
        # 将当前用户（或执行 sudo 的用户）添加到 docker 组
        # 处理 SUDO_USER 未设置的情况 (例如，脚本直接以 root 身份运行)
        CURRENT_USER_TO_ADD_TO_DOCKER_GROUP="${SUDO_USER:-$USER}"
        if ! groups "$CURRENT_USER_TO_ADD_TO_DOCKER_GROUP" | grep -q '\bdocker\b'; then
             sudo usermod -aG docker "$CURRENT_USER_TO_ADD_TO_DOCKER_GROUP"
             print_yellow "已将用户 '$CURRENT_USER_TO_ADD_TO_DOCKER_GROUP' 添加到 docker 用户组。"
             print_yellow "您可能需要注销并重新登录，或运行 'newgrp docker' 来使此更改立即生效。"
        fi
        rm get-docker.sh
        print_green "Docker 安装成功。"
    else
        rm -f get-docker.sh # 清理下载的脚本
        print_red "Docker 安装失败。请参考 Docker 官方文档手动安装。"
        exit 1
    fi
else
    print_yellow "Docker 已安装，跳过安装步骤。"
fi

# 验证Docker安装
if ! command -v docker &> /dev/null; then
    print_red "Docker 安装验证失败。请手动安装 Docker 后重试。"
    exit 1
fi
if ! docker info > /dev/null 2>&1; then
    print_red "Docker 服务未运行或当前用户无权限访问 Docker。"
    print_yellow "请确保 Docker 服务已启动，并且当前用户属于 'docker' 组（可能需要重新登录）。"
    # exit 1 # 暂时不退出，允许后续脚本继续，但 docker-compose 可能失败
fi


# 安装Docker Compose
print_green "步骤 4: 安装Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    print_yellow "Docker Compose (v1) 未安装，正在尝试安装..."
    # 使用固定版本以保证稳定性，可以根据需要更新此版本
    COMPOSE_VERSION="v2.20.3" 
    print_yellow "将安装 Docker Compose 版本: $COMPOSE_VERSION"
    
    COMPOSE_DEST="/usr/local/bin/docker-compose"
    if sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o "$COMPOSE_DEST"; then
        sudo chmod +x "$COMPOSE_DEST"
        # 如果 /usr/bin 在 PATH 中，而 /usr/local/bin 可能对所有用户/服务不可用，则创建符号链接以增强兼容性
        if [ ! -f /usr/bin/docker-compose ] && [ -d /usr/bin ]; then
             sudo ln -sf "$COMPOSE_DEST" /usr/bin/docker-compose
        fi
        print_green "Docker Compose 安装成功。"
    else
        print_red "Docker Compose 下载或安装失败。"
        # 尝试检查 Docker Compose V2 (docker compose)
        if command -v docker &> /dev/null && docker compose version &> /dev/null; then
            print_yellow "检测到 Docker Compose V2 (命令: docker compose)。您可以使用 'docker compose' 代替 'docker-compose'。"
        else
            print_red "Docker Compose V1 和 V2 均未成功安装/检测到。请手动安装。"
            exit 1
        fi
    fi
else
    print_yellow "Docker Compose (v1) 已安装，跳过安装步骤。"
fi

# 验证Docker Compose安装
# 优先验证 v1, 如果失败再尝试 v2
COMPOSE_V1_OK=false
COMPOSE_V2_OK=false

if command -v docker-compose &> /dev/null; then
    COMPOSE_V1_OK=true
fi
if command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_V2_OK=true
fi

if ! $COMPOSE_V1_OK && ! $COMPOSE_V2_OK; then
    print_red "Docker Compose 安装验证失败。请手动安装 Docker Compose (v1 或 v2) 后重试。"
    exit 1
else
    if $COMPOSE_V1_OK; then
        print_green "Docker Compose v1 (`docker-compose`) 可用。"
    fi
    if $COMPOSE_V2_OK; then
        print_green "Docker Compose v2 (`docker compose`) 可用。"
    fi
fi


print_green "所有依赖安装完成！"
print_blue "========================================"
print_blue "           安装结果摘要"
print_blue "========================================"
echo "Docker 版本: $(docker --version 2>/dev/null || echo '无法获取')"
if $COMPOSE_V1_OK; then
    echo "Docker Compose v1 版本: $(docker-compose --version 2>/dev/null || echo '无法获取')"
fi
if $COMPOSE_V2_OK; then
    echo "Docker Compose v2 版本: $(docker compose version 2>/dev/null || echo '无法获取')"
fi

print_yellow "如果之前添加了用户到 'docker' 组，请确保您已注销并重新登录，或运行 'newgrp docker'，以使组更改生效。"
print_yellow "继续执行项目初始化脚本..."

exit 0
