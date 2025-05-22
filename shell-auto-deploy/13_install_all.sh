#!/bin/bash

# 域名管理系统 - 统一安装总脚本
# 此脚本将依次调用所有模块化生成脚本，实现一站式安装整个域名管理系统。

# 记录开始时间
START_TIME=$(date +%s)
# 定义临时目录路径
TEMP_DIR="/tmp/domain-management-system"

# 彩色输出函数 (适配非交互模式)
print_green() {
    if [ "$NON_INTERACTIVE" != "true" ]; then echo -e "\e[32m$1\e[0m"; else echo "$1"; fi
}
print_yellow() {
    if [ "$NON_INTERACTIVE" != "true" ]; then echo -e "\e[33m$1\e[0m"; else echo "$1"; fi
}
print_red() {
    if [ "$NON_INTERACTIVE" != "true" ]; then echo -e "\e[31m$1\e[0m"; else echo "错误: $1"; fi
}
print_blue() {
    if [ "$NON_INTERACTIVE" != "true" ]; then echo -e "\e[34m$1\e[0m"; else echo "$1"; fi
}

# --- 解析命令行参数 ---
NON_INTERACTIVE="false"
INSTALL_DIR_ARG=""
MONGO_USER_ARG=""
MONGO_PASSWORD_ARG=""

# 帮助函数
show_help() {
    echo "域名管理系统安装脚本 - $0"
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --non-interactive         启用无人值守模式，跳过所有交互式提示。"
    echo "  --install-dir=<目录>      指定项目安装目录 (在无人值守模式下为必需项)。"
    echo "                            示例: --install-dir=/opt/domain-app"
    echo "  --mongo-user=<用户名>     指定MongoDB的初始管理员用户名 (无人值守模式下可选)。"
    echo "                            如果未提供，脚本 02 将使用默认值 'admin'。"
    echo "  --mongo-password=<密码>   指定MongoDB的初始管理员密码 (无人值守模式下可选)。"
    echo "                            如果未提供，脚本 02 将使用默认值 'domain_mgmt_pwd'。"
    echo "  --help                    显示此帮助信息并退出。"
    echo ""
    echo "注意: 运行此脚本可能需要sudo权限以安装系统依赖 (如Docker)。"
    echo "脚本内部的 'apt install' 等命令会使用 'sudo'。"
}

# 解析参数
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --non-interactive) NON_INTERACTIVE="true"; shift ;;
        --install-dir=*) INSTALL_DIR_ARG="${1#*=}"; shift ;;
        --mongo-user=*) MONGO_USER_ARG="${1#*=}"; shift ;;
        --mongo-password=*) MONGO_PASSWORD_ARG="${1#*=}"; shift ;;
        --help) show_help; exit 0 ;;
        *) echo "未知选项: $1"; show_help; exit 1 ;;
    esac
done

# --- 初始化和环境检查 ---
# 确保临时配置目录存在
mkdir -p "$TEMP_DIR"
# 定义临时配置文件路径
AUTO_INSTALL_CONFIG_FILE="$TEMP_DIR/auto_install"
COMPLETED_STEPS_FILE="$TEMP_DIR/completed_steps"
PROJECT_CONFIG_FILE="$TEMP_DIR/config" # 此文件由 02_initialize_project.sh 创建

# 显示欢迎信息和脚本说明 (仅在交互模式下)
if [ "$NON_INTERACTIVE" != "true" ]; then
    clear
    cat << "EOF"

欢迎使用 域名管理系统 安装向导
=============================================
此脚本将引导您完成以下安装步骤:
1. 安装必要的系统依赖 (如 Docker, Docker Compose)。
2. 创建完整的项目目录结构。
3. 生成所有必要的配置文件和前后端代码。
4. 配置 Docker 环境。
5. (可选) 在安装完成后自动构建并启动应用。

在安装过程中，部分步骤 (如依赖安装) 可能需要您输入 sudo 密码。

EOF
    read -p "是否确认并开始安装? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_red "安装已取消。"
        exit 1
    fi
else # 非交互模式
    print_blue "域名管理系统 - 无人值守自动安装模式已启动。"
    if [ -z "$INSTALL_DIR_ARG" ]; then
        print_red "错误：在无人值守模式下，必须通过 --install-dir=<目录> 参数指定安装目录。"
        exit 1
    fi
    # 将非交互参数写入临时文件，供 02_initialize_project.sh 读取
    # 注意：密码直接写入临时文件存在安全风险，确保/tmp目录权限安全或考虑其他传递方式
    echo "INSTALL_DIR=$INSTALL_DIR_ARG" > "$AUTO_INSTALL_CONFIG_FILE"
    echo "MONGO_USER=$MONGO_USER_ARG" >> "$AUTO_INSTALL_CONFIG_FILE"
    echo "MONGO_PASSWORD=$MONGO_PASSWORD_ARG" >> "$AUTO_INSTALL_CONFIG_FILE"
    print_yellow "无人值守模式配置已写入: $AUTO_INSTALL_CONFIG_FILE"
    if [ -z "$MONGO_USER_ARG" ]; then print_yellow "提示: 未指定MongoDB用户名，将使用默认值 'admin'。"; fi
    if [ -z "$MONGO_PASSWORD_ARG" ]; then print_yellow "提示: 未指定MongoDB密码，将使用默认值 'domain_mgmt_pwd'。"; fi
fi

# 获取当前脚本所在目录
SCRIPT_SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

# 定义所有模块化生成脚本的顺序
MODULE_SCRIPTS=(
  "01_install_dependencies.sh"
  "02_initialize_project.sh"
  "03_setup_docker.sh"
  "04_setup_frontend_config.sh"
  "05_setup_frontend_api.sh"
  "06_setup_frontend_components.sh"
  "07_setup_frontend_pages.sh"
  "08_setup_frontend_interactive.sh"
  "09_setup_frontend_charts.sh"
  "10_setup_backend_config.sh"
  "11_setup_backend_models.sh"
  "12_setup_management_scripts.sh"
)

# 检查所有模块化脚本是否存在
print_blue "检查所需脚本文件..."
for script_name in "${MODULE_SCRIPTS[@]}"; do
  if [ ! -f "$SCRIPT_SOURCE_DIR/$script_name" ]; then
    print_red "关键错误: 找不到必需的模块化脚本 '$SCRIPT_SOURCE_DIR/$script_name'。"
    print_yellow "请确保所有生成脚本 (01_*.sh 至 12_*.sh) 都与此安装脚本 (13_install_all.sh) 放在同一目录下。"
    exit 1
  fi
done
print_green "所有必需脚本文件均已找到。"

# 确保所有模块化脚本都有执行权限
print_blue "设置脚本执行权限..."
for script_name in "${MODULE_SCRIPTS[@]}"; do
  chmod +x "$SCRIPT_SOURCE_DIR/$script_name"
done

# 清空之前的完成步骤记录 (用于断点续传的简单实现，当前未启用)
# >"$COMPLETED_STEPS_FILE"

# --- 依次执行所有模块化脚本 ---
total_scripts=${#MODULE_SCRIPTS[@]}
print_blue "开始执行安装流程 (共 $total_scripts 个步骤)..."
echo ""

for i in "${!MODULE_SCRIPTS[@]}"; do
  script_name="${MODULE_SCRIPTS[$i]}"
  script_path="$SCRIPT_SOURCE_DIR/$script_name"
  
  current_step=$((i + 1))
  progress_percentage=$(( (current_step * 100) / total_scripts ))
  
  print_blue ">>> 步骤 $current_step/$total_scripts (${progress_percentage}%): 正在执行 '$script_name' <<<"
  
  # 执行脚本，并传递非交互模式标志
  # 将标准输出和错误输出重定向到日志文件，以便调试
  script_log_file="$TEMP_DIR/${script_name}.log"
  
  if [ "$NON_INTERACTIVE" = "true" ]; then
    if "$script_path" --non-interactive > "$script_log_file" 2>&1; then
        exit_code=0
    else
        exit_code=$? # 捕获脚本的退出码
    fi
  else
    # 在交互模式下，直接执行脚本，允许其输出到终端
    if "$script_path"; then
        exit_code=0
    else
        exit_code=$?
    fi
  fi

  # 检查脚本执行结果
  if [ $exit_code -ne 0 ]; then
    print_red "错误: 脚本 '$script_name' 执行失败! (退出代码: $exit_code)"
    if [ -f "$script_log_file" ]; then
      print_yellow "脚本 '$script_name' 的日志输出如下 (更多详情请查看 $script_log_file):"
      tail -n 20 "$script_log_file" # 显示最后20行日志
    fi
    print_yellow "请检查上述错误信息，修复问题后可尝试重新运行此安装脚本。"
    exit 1
  fi

  # 记录已完成的步骤 (用于可能的断点续传逻辑)
  echo "$script_name" >> "$COMPLETED_STEPS_FILE"
  
  print_green "脚本 '$script_name' 执行成功。"
  echo # 添加空行以分隔步骤输出
done

# --- 安装完成总结 ---
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))
HOURS=$((TOTAL_TIME / 3600))
MINUTES=$(( (TOTAL_TIME % 3600) / 60 ))
SECONDS=$((TOTAL_TIME % 60))

# 从临时配置文件读取项目目录 (此文件由 02_initialize_project.sh 创建)
PROJECT_DIR_FINAL=""
if [ -f "$PROJECT_CONFIG_FILE" ]; then
  # 使用 source 在子shell中执行，避免污染当前环境，并捕获 PROJECT_DIR 的值
  PROJECT_DIR_FINAL=$( (source "$PROJECT_CONFIG_FILE" && echo "$PROJECT_DIR") )
fi

print_blue "======================================================"
print_green "      🎉 域名管理系统所有安装脚本执行完毕！ 🎉"
print_blue "======================================================"

if [ -n "$PROJECT_DIR_FINAL" ] && [ -d "$PROJECT_DIR_FINAL" ]; then
  print_green "项目已成功生成并配置在目录: $PROJECT_DIR_FINAL"
else
  print_yellow "警告: 未能从 '$PROJECT_CONFIG_FILE' 成功读取项目目录。"
  print_yellow "请手动检查在脚本02中指定的安装目录。"
  # 尝试从非交互参数中获取安装目录作为备选
  if [ -n "$INSTALL_DIR_ARG" ]; then
      PROJECT_DIR_FINAL="${INSTALL_DIR_ARG/#\~/$HOME}" # 展开~
      print_yellow "尝试使用命令行参数指定的目录: $PROJECT_DIR_FINAL"
  fi
fi

print_green "总安装用时: ${HOURS}小时 ${MINUTES}分钟 ${SECONDS}秒。"
echo ""

if [ -n "$PROJECT_DIR_FINAL" ] && [ -d "$PROJECT_DIR_FINAL" ]; then
  print_yellow "后续操作建议:"
  echo "1. 进入项目目录:"
  echo -e "   \e[1mcd \"$PROJECT_DIR_FINAL\"\e[0m"
  echo "2. (可选) 查看生成的 README.md 文件获取更多使用信息。"
  echo "3. 运行一键启动脚本以构建并启动所有服务:"
  echo -e "   \e[1m./run.sh\e[0m"
  echo "   (首次运行会构建Docker镜像，可能需要一些时间)"
  echo ""

  # 询问是否立即构建并启动服务 (仅在交互模式下)
  if [ "$NON_INTERACTIVE" != "true" ]; then
    read -p "是否立即构建并启动域名管理系统服务? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      print_blue "正在进入项目目录并执行 './run.sh' ..."
      # 确保 run.sh 有执行权限
      if [ -f "$PROJECT_DIR_FINAL/run.sh" ]; then
        chmod +x "$PROJECT_DIR_FINAL/run.sh"
        cd "$PROJECT_DIR_FINAL" && ./run.sh
      else
        print_red "错误: 未找到 '$PROJECT_DIR_FINAL/run.sh'。无法自动启动。"
      fi
    else
      print_yellow "服务未启动。您可以稍后手动进入项目目录并运行 './run.sh'。"
    fi
  else
    print_yellow "无人值守模式：安装完成。请稍后手动进入项目目录 '$PROJECT_DIR_FINAL' 并运行 './run.sh' 来启动服务。"
  fi
else
  print_red "项目目录信息不明确，无法提供后续启动指引。请检查安装过程中的错误信息。"
fi

# 清理临时文件和目录
print_blue "清理临时安装文件..."
rm -f "$PROJECT_CONFIG_FILE"
rm -f "$AUTO_INSTALL_CONFIG_FILE"
rm -f "$COMPLETED_STEPS_FILE"
# 删除所有在 $TEMP_DIR 下的 .log 文件
find "$TEMP_DIR" -name "*.log" -type f -delete
# 尝试删除临时目录本身 (如果为空)
rmdir "$TEMP_DIR" 2>/dev/null || print_yellow "提示: 临时目录 $TEMP_DIR 未能完全清空，可能包含其他文件。"

echo ""
print_green "感谢您使用域名管理系统！如果您遇到任何问题，请参考文档或寻求支持。"
exit 0
