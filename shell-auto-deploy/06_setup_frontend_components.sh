#!/bin/bash

# 域名管理系统 - 前端基础组件脚本
# 此脚本负责创建Layout等基础UI组件。

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

# 读取配置
# PROJECT_DIR 将从此文件加载
if [ -f /tmp/domain-management-system/config ]; then
    source /tmp/domain-management-system/config
else
    print_red "错误：找不到配置文件 /tmp/domain-management-system/config。"
    print_red "请确保已先运行初始化脚本 (02_initialize_project.sh)。"
    exit 1
fi

# 检查 PROJECT_DIR 是否已设置
if [ -z "$PROJECT_DIR" ]; then
    print_red "错误：项目目录 (PROJECT_DIR) 未在配置文件中设置。"
    exit 1
fi

# 显示脚本信息
print_blue "========================================"
print_blue "    域名管理系统 - 前端基础组件脚本"
print_blue "========================================"
print_yellow "此脚本将创建以下基础组件:"
echo "1. Layout.jsx - 主布局组件 (包含侧边栏和头部导航)"

# 创建Layout组件目录 (如果不存在)
mkdir -p "$PROJECT_DIR/frontend/src/components/Layout"

# 创建Layout组件 (Layout.jsx)
print_green "创建主布局组件 (./frontend/src/components/Layout/Layout.jsx)..."
cat > "$PROJECT_DIR/frontend/src/components/Layout/Layout.jsx" << 'EOF'
import { Fragment, useState } from 'react'; // Fragment 用于包裹多个元素
import { Link, Outlet, useLocation } from 'react-router-dom'; // React Router 用于导航和嵌套路由
import { Dialog, Transition } from '@headlessui/react'; // Headless UI 用于构建可访问的UI组件
import { 
  HomeIcon,         // 仪表盘图标
  TableCellsIcon,   // 域名列表图标
  ClockIcon,        // 历史记录图标
  ServerStackIcon,  // 系统状态图标 (替换了 ServerIcon)
  DocumentTextIcon, // 续费标准图标
  Bars3Icon,        // 移动端菜单打开图标
  XMarkIcon         // 移动端菜单关闭图标
} from '@heroicons/react/24/outline'; // 使用 Heroicons v2 Outline 版本

// 导航菜单项配置
const navigation = [
  { name: '仪表盘', href: '/', icon: HomeIcon },
  { name: '域名列表', href: '/domains', icon: TableCellsIcon },
  { name: '历史记录', href: '/history', icon: ClockIcon },
  { name: '续费标准', href: '/renewal-standards', icon: DocumentTextIcon },
  { name: '系统状态', href: '/system', icon: ServerStackIcon } // 更新图标
];

// 辅助函数：合并 Tailwind CSS 类名
function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // 移动端侧边栏的打开/关闭状态
  const location = useLocation(); // 获取当前路由位置，用于高亮活动菜单项
  
  return (
    <>
      {/* 整体布局容器 */}
      <div className="min-h-screen bg-gray-100">
        {/* 移动端侧边栏 (使用 Headless UI Dialog 和 Transition 实现) */}
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
            {/* 遮罩层 */}
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/80" />
            </Transition.Child>

            <div className="fixed inset-0 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                  {/* 关闭按钮 */}
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                      <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                        <span className="sr-only">关闭侧边栏</span>
                        <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      </button>
                    </div>
                  </Transition.Child>
                  
                  {/* 侧边栏内容 (移动端) */}
                  <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4 ring-1 ring-white/10">
                    <div className="flex h-16 shrink-0 items-center">
                      {/* <img
                        className="h-8 w-auto"
                        src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=500" // 可替换为项目Logo
                        alt="域名管理系统"
                      /> */}
                      <h1 className="text-xl font-bold text-white">域名管理</h1>
                    </div>
                    <nav className="flex flex-1 flex-col">
                      <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                          <ul role="list" className="-mx-2 space-y-1">
                            {navigation.map((item) => (
                              <li key={item.name}>
                                <Link
                                  to={item.href}
                                  onClick={() => setSidebarOpen(false)} // 点击后关闭侧边栏
                                  className={classNames(
                                    location.pathname === item.href
                                      ? 'bg-gray-800 text-white'
                                      : 'text-gray-400 hover:text-white hover:bg-gray-800',
                                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                  )}
                                >
                                  <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                  {item.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                        {/* 可在此添加其他导航组或用户头像等 */}
                      </ul>
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        {/* 桌面端静态侧边栏 */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              {/* <img
                className="h-8 w-auto"
                src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=500" // 可替换为项目Logo
                alt="域名管理系统"
              /> */}
              <h1 className="text-xl font-bold text-white">域名管理系统</h1>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          className={classNames(
                            location.pathname === item.href
                              ? 'bg-gray-800 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800',
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                          )}
                        >
                          <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
                {/* 可在此添加其他导航组或用户头像等 */}
              </ul>
            </nav>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="lg:pl-64"> {/* 左边距为桌面侧边栏宽度 */}
          {/* 顶部导航栏 (移动端菜单按钮) */}
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <button type="button" className="-m-2.5 p-2.5 text-gray-700 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <span className="sr-only">打开侧边栏</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* 分隔线 */}
            <div className="h-6 w-px bg-gray-900/10 lg:hidden" aria-hidden="true" />

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              {/* 搜索框 (示例，当前未实现功能) */}
              <form className="relative flex flex-1" action="#" method="GET">
                {/* 
                <label htmlFor="search-field" className="sr-only">搜索</label>
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  id="search-field"
                  className="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                  placeholder="搜索..."
                  type="search"
                  name="search"
                />
                */}
              </form>
              {/* 可在此添加用户菜单、通知等 */}
            </div>
          </div>

          {/* 页面内容 */}
          <main className="py-10">
            <div className="px-4 sm:px-6 lg:px-8">
              <Outlet /> {/* React Router 的 Outlet 用于渲染子路由对应的组件 */}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
EOF

print_green "前端基础布局组件创建完成！"
print_blue "========================================"
print_blue "         前端基础组件摘要"
print_blue "========================================"
echo "已创建: ./frontend/src/components/Layout/Layout.jsx"
print_yellow "继续执行前端页面组件脚本..."

exit 0
