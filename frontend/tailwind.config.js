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
