#!/bin/bash

# GitHub项目自动托管脚本
# 此脚本帮助将当前目录中的项目自动上传到GitHub并设置为远程仓库

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # 无颜色

# 显示带颜色的消息函数
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_message $RED "错误: $1 未安装，正在尝试安装..."
        sudo apt update && sudo apt install -y $1
        if [ $? -ne 0 ]; then
            print_message $RED "安装 $1 失败，请手动安装后重试"
            exit 1
        fi
    fi
}

# 检查必要的命令
check_command git
check_command curl

# 获取当前目录名作为默认仓库名
default_repo_name=$(basename "$(pwd)")

# 询问GitHub信息
print_message $YELLOW "请注意：GitHub用户名应该是您的登录名，不是邮箱地址"
read -p "输入GitHub用户名(登录名，不是邮箱): " github_username
read -p "输入GitHub个人访问令牌(PAT): " github_token
read -p "输入仓库名称 [$default_repo_name]: " repo_name
repo_name=${repo_name:-$default_repo_name}
read -p "输入仓库描述: " repo_description
read -p "是否为私有仓库? (y/n): " is_private

if [[ "$is_private" =~ ^[Yy]$ ]]; then
    private_option="true"
else
    private_option="false"
fi

# 初始化Git仓库(如果尚未初始化)
if [ ! -d .git ]; then
    print_message $YELLOW "初始化Git仓库..."
    git init
    if [ $? -ne 0 ]; then
        print_message $RED "Git初始化失败"
        exit 1
    fi
fi

# 配置Git用户信息(如果需要)
if [ -z "$(git config user.email)" ]; then
    read -p "输入Git邮箱: " git_email
    git config user.email "$git_email"
fi

if [ -z "$(git config user.name)" ]; then
    read -p "输入Git用户名: " git_name
    git config user.name "$git_name"
fi

# 创建.gitignore文件(如果不存在)
if [ ! -f .gitignore ]; then
    print_message $YELLOW "创建默认.gitignore文件..."
    cat > .gitignore << EOL
# 操作系统文件
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# 日志文件
*.log

# 编译文件
*.o
*.pyc
*.class

# 临时文件
*.swp
*.swo
*~

# 环境文件
.env
.env.local
.env.development
.env.test
.env.production

# 依赖目录
node_modules/
vendor/
/venv/
/__pycache__/
EOL
fi

# 创建README.md文件(如果不存在)
if [ ! -f README.md ]; then
    print_message $YELLOW "创建默认README.md文件..."
    cat > README.md << EOL
# $repo_name

$repo_description

## 项目说明

这是一个自动上传到GitHub的项目。

## 安装

\`\`\`bash
# 克隆仓库
git clone https://github.com/$github_username/$repo_name.git

# 进入项目目录
cd $repo_name
\`\`\`

## 使用方法

待补充

## 许可证

MIT
EOL
fi

# 添加所有文件到Git
print_message $YELLOW "添加文件到Git..."
git add .

# 提交更改
print_message $YELLOW "提交更改..."
git commit -m "初始化提交"

# 如果没有提交内容，创建一个空的提交
if [ $? -ne 0 ]; then
    print_message $YELLOW "创建空提交..."
    git commit --allow-empty -m "初始化空提交"
fi

# 通过API创建GitHub仓库
print_message $YELLOW "在GitHub上创建仓库..."
create_repo_response=$(curl -s -X POST \
    -H "Authorization: token $github_token" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/user/repos \
    -d "{\"name\":\"$repo_name\",\"description\":\"$repo_description\",\"private\":$private_option}")

# 检查仓库是否创建成功
if echo "$create_repo_response" | grep -q "errors"; then
    if echo "$create_repo_response" | grep -q "already exists"; then
        print_message $YELLOW "仓库已存在，尝试连接..."
    else
        print_message $RED "创建GitHub仓库失败："
        echo "$create_repo_response"
        exit 1
    fi
fi

# 获取当前分支名
current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ -z "$current_branch" ] || [ "$current_branch" = "HEAD" ]; then
    # 如果当前没有分支或处于分离HEAD状态，创建并切换到main分支
    print_message $YELLOW "创建main分支..."
    git checkout -b main
    current_branch="main"
fi

# 添加远程仓库（使用正确的URL格式）
print_message $YELLOW "添加远程仓库..."
git remote remove origin 2>/dev/null
# 使用正确的URL格式
git_url="https://${github_token}@github.com/${github_username}/${repo_name}.git"
git remote add origin "$git_url"

# 推送到GitHub
print_message $YELLOW "推送到GitHub，使用当前分支: $current_branch..."
git push -u origin "$current_branch"

# 检查是否推送成功
if [ $? -eq 0 ]; then
    print_message $GREEN "✅ 成功! 项目已上传到GitHub: https://github.com/$github_username/$repo_name"
else
    # 如果当前分支不是main，尝试创建并推送main分支
    if [ "$current_branch" != "main" ]; then
        print_message $YELLOW "尝试使用main分支..."
        git checkout -b main
        git push -u origin main
        
        if [ $? -eq 0 ]; then
            print_message $GREEN "✅ 成功! 项目已上传到GitHub: https://github.com/$github_username/$repo_name"
        else
            print_message $RED "推送到GitHub失败"
            echo "推送失败，请检查GitHub用户名和令牌是否正确"
            exit 1
        fi
    else
        print_message $RED "推送到GitHub失败"
        echo "推送失败，请检查GitHub用户名和令牌是否正确"
        exit 1
    fi
fi

# 提示用户设置GitHub Pages(如果需要)
read -p "是否设置GitHub Pages? (y/n): " setup_pages

if [[ "$setup_pages" =~ ^[Yy]$ ]]; then
    print_message $YELLOW "正在设置GitHub Pages..."
    curl -s -X POST \
        -H "Authorization: token $github_token" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/$github_username/$repo_name/pages" \
        -d '{"source":{"branch":"main","path":"/"}}'
    
    print_message $GREEN "GitHub Pages已设置，稍后可访问: https://$github_username.github.io/$repo_name"
fi

print_message $GREEN "操作完成!"
