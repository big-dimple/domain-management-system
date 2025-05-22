#!/bin/bash

# 域名管理系统 - 前端基础配置脚本
# 此脚本负责创建前端项目的核心配置文件，如 package.json, vite.config.js 等。

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
print_blue "    域名管理系统 - 前端基础配置脚本"
print_blue "========================================"
print_yellow "此脚本将创建以下前端配置文件:"
echo "1. package.json (前端依赖和脚本)"
echo "2. vite.config.js (Vite 构建配置)"
echo "3. tailwind.config.js (Tailwind CSS 配置)"
echo "4. postcss.config.js (PostCSS 配置)"
echo "5. index.html (前端入口HTML)"
echo "6. src/index.css (Tailwind CSS 指令)"
echo "7. src/main.jsx (React 应用入口)"
echo "8. src/App.jsx (React 根组件和路由)"

# 创建前端package.json
print_green "创建前端 package.json (./frontend/package.json)..."
cat > "$PROJECT_DIR/frontend/package.json" << 'EOF'
{
  "name": "domain-management-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@headlessui/react": "^1.7.15",
    "@heroicons/react": "^2.0.18",
    "axios": "^1.4.0",
    "chart.js": "^4.3.0",
    "dayjs": "^1.11.8",
    "file-saver": "^2.0.5",
    "react": "^18.2.0",
    "react-chartjs-2": "^5.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.45.0",
    "react-hot-toast": "^2.4.1",
    "react-router-dom": "^6.13.0",
    "react-table": "^7.8.0",
    "zustand": "^4.3.8"
  },
  "devDependencies": {
    "@tailwindcss/typography": "^0.5.10",
    "@types/react": "^18.2.12",
    "@types/react-dom": "^18.2.5",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.3.2",
    "vite": "^4.3.9"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
EOF

# 创建前端vite配置
print_green "创建 Vite 配置文件 (./frontend/vite.config.js)..."
cat > "$PROJECT_DIR/frontend/vite.config.js" << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite 配置文档: https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()], // 使用 React 插件
  server: {
    port: 3000, // 开发服务器端口 (在Docker外部直接运行时使用)
              // 在Docker容器内，Nginx会处理代理，此端口主要用于本地开发
    proxy: {
      // 配置API请求代理，用于开发环境解决跨域问题
      '/api': {
        target: 'http://localhost:3001', // 后端API服务器地址 (本地开发时)
                                         // 注意: Docker部署时，Nginx会处理此代理
        changeOrigin: true, // 是否改变 Origin 请求头
        secure: false       // 如果后端是HTTPS且证书无效，设为false
      }
    }
  },
  build: {
    outDir: 'dist' // 构建输出目录，默认为 dist
  }
})
EOF

# 创建前端tailwind配置
print_green "创建 Tailwind CSS 配置文件 (./frontend/tailwind.config.js)..."
cat > "$PROJECT_DIR/frontend/tailwind.config.js" << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", // 扫描 HTML 文件
    "./src/**/*.{js,ts,jsx,tsx}", // 扫描 src 目录下所有 JS/TS/JSX/TSX 文件以查找 Tailwind 类名
  ],
  theme: {
    extend: {
      // 在这里扩展 Tailwind 的默认主题，例如自定义颜色、字体、间距等
      // colors: {
      //   'brand-blue': '#1992d4',
      // },
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // 启用 Tailwind Typography 插件，用于 Markdown 渲染等
    // require('@tailwindcss/forms'), // 可选：如果需要美化表单元素
  ],
}
EOF

# 创建前端postcss配置
print_green "创建 PostCSS 配置文件 (./frontend/postcss.config.js)..."
cat > "$PROJECT_DIR/frontend/postcss.config.js" << 'EOF'
export default {
  plugins: {
    tailwindcss: {}, // 集成 Tailwind CSS
    autoprefixer: {}, // 自动添加浏览器前缀以兼容旧版浏览器
  },
}
EOF

# 创建前端index.html
print_green "创建前端入口 HTML (./frontend/index.html)..."
cat > "$PROJECT_DIR/frontend/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" /> <!-- 可替换为项目图标 -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>域名管理系统</title>
    <meta name="description" content="现代化的域名管理系统，帮助您集中管理、追踪和监控多个公司/主体的域名资产。" />
  </head>
  <body>
    <div id="root"></div> <!-- React 应用将挂载到此 div -->
    <script type="module" src="/src/main.jsx"></script> <!-- Vite 入口脚本 -->
  </body>
</html>
EOF

# 创建前端CSS文件 (Tailwind 指令)
print_green "创建 Tailwind CSS 入口文件 (./frontend/src/index.css)..."
cat > "$PROJECT_DIR/frontend/src/index.css" << 'EOF'
@tailwind base;      /* Tailwind CSS 基础样式 (重置、预设等) */
@tailwind components; /* Tailwind CSS 组件类 */
@tailwind utilities;  /* Tailwind CSS 工具类 */

/* 你可以在这里添加全局自定义样式 */
/* 例如:
body {
  font-family: 'Inter', sans-serif;
}
*/
EOF

# 创建前端main.jsx (React 入口)
print_green "创建 React 应用入口文件 (./frontend/src/main.jsx)..."
cat > "$PROJECT_DIR/frontend/src/main.jsx" << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // 导入根组件
import './index.css';   // 导入全局样式 (包含Tailwind指令)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode> {/* 严格模式，有助于发现潜在问题 */}
    <App />
  </React.StrictMode>
);
EOF

# 创建前端App.jsx (React 根组件)
print_green "创建 React 根组件 (./frontend/src/App.jsx)..."
cat > "$PROJECT_DIR/frontend/src/App.jsx" << 'EOF'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // 用于显示通知
import Layout from './components/Layout/Layout'; // 主布局组件
import DashboardPage from './pages/DashboardPage'; // 仪表盘页面
import DomainListPage from './pages/DomainListPage'; // 域名列表页面
import HistoryPage from './pages/HistoryPage'; // 历史记录页面
import RenewalStandardsPage from './pages/RenewalStandardsPage'; // 续费标准页面
import SystemPage from './pages/SystemPage'; // 系统状态页面

export default function App() {
  return (
    <Router> {/* 使用 BrowserRouter 进行客户端路由 */}
      <Routes> {/* 定义路由规则 */}
        <Route path="/" element={<Layout />}> {/* 所有页面共享 Layout 布局 */}
          <Route index element={<DashboardPage />} /> {/* 默认首页 (路径为 /) */}
          <Route path="domains" element={<DomainListPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="renewal-standards" element={<RenewalStandardsPage />} />
          <Route path="system" element={<SystemPage />} />
          {/* 可以在这里添加更多页面路由 */}
        </Route>
      </Routes>
      <Toaster position="top-right" /> {/* 配置 react-hot-toast 通知的位置 */}
    </Router>
  );
}
EOF

print_green "前端基础配置文件创建完成！"
print_blue "========================================"
print_blue "         前端基础配置摘要"
print_blue "========================================"
echo "已创建: ./frontend/package.json"
echo "已创建: ./frontend/vite.config.js"
echo "已创建: ./frontend/tailwind.config.js"
echo "已创建: ./frontend/postcss.config.js"
echo "已创建: ./frontend/index.html"
echo "已创建: ./frontend/src/index.css"
echo "已创建: ./frontend/src/main.jsx"
echo "已创建: ./frontend/src/App.jsx"
print_yellow "继续执行前端API服务与状态管理脚本..."

exit 0
