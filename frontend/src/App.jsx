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
