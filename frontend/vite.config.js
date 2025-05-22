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
