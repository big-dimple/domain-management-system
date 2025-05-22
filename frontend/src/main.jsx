import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // 导入根组件
import './index.css';   // 导入全局样式 (包含Tailwind指令)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode> {/* 严格模式，有助于发现潜在问题 */}
    <App />
  </React.StrictMode>
);
