import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);

const ChartBarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const QuestionMarkCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
  </svg>
);

const Bars3Icon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const XMarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// 简单的页面组件
const DomainList = () => (
  <div className="container mx-auto px-4">
    <h1 className="text-2xl font-bold text-gray-800 mb-6">域名列表</h1>
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-lg">正在加载域名列表...</p>
      <p className="mt-4 text-gray-600">这是一个临时页面。实际页面正在构建中...</p>
    </div>
  </div>
);

const Dashboard = () => (
  <div className="container mx-auto px-4">
    <h1 className="text-2xl font-bold text-gray-800 mb-6">仪表盘</h1>
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-lg">仪表盘正在构建中...</p>
    </div>
  </div>
);

const History = () => (
  <div className="container mx-auto px-4">
    <h1 className="text-2xl font-bold text-gray-800 mb-6">历史记录</h1>
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-lg">历史记录页面正在构建中...</p>
    </div>
  </div>
);

const Help = () => (
  <div className="container mx-auto px-4">
    <h1 className="text-2xl font-bold text-gray-800 mb-6">帮助说明</h1>
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-lg">帮助页面正在构建中...</p>
    </div>
  </div>
);

const App = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 侧边栏导航 - 桌面版 */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white shadow-md">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary-700">域名管理系统</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            <li>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-lg hover:bg-gray-100 ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                  }`
                }
              >
                <HomeIcon className="w-5 h-5 mr-2" />
                域名列表
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-lg hover:bg-gray-100 ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                  }`
                }
              >
                <ChartBarIcon className="w-5 h-5 mr-2" />
                仪表盘
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/history"
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-lg hover:bg-gray-100 ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                  }`
                }
              >
                <ClockIcon className="w-5 h-5 mr-2" />
                历史记录
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/help"
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-lg hover:bg-gray-100 ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                  }`
                }
              >
                <QuestionMarkCircleIcon className="w-5 h-5 mr-2" />
                帮助说明
              </NavLink>
            </li>
          </ul>
        </nav>
      </aside>

      {/* 移动导航菜单 */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 md:hidden">
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h1 className="text-xl font-bold text-primary-700">域名管理系统</h1>
              <button onClick={toggleMobileMenu} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <nav className="p-4">
              <ul className="space-y-2">
                <li>
                  <NavLink
                    to="/"
                    onClick={toggleMobileMenu}
                    className={({ isActive }) =>
                      `flex items-center p-2 rounded-lg ${
                        isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                      }`
                    }
                  >
                    <HomeIcon className="w-5 h-5 mr-2" />
                    域名列表
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/dashboard"
                    onClick={toggleMobileMenu}
                    className={({ isActive }) =>
                      `flex items-center p-2 rounded-lg ${
                        isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                      }`
                    }
                  >
                    <ChartBarIcon className="w-5 h-5 mr-2" />
                    仪表盘
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/history"
                    onClick={toggleMobileMenu}
                    className={({ isActive }) =>
                      `flex items-center p-2 rounded-lg ${
                        isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                      }`
                    }
                  >
                    <ClockIcon className="w-5 h-5 mr-2" />
                    历史记录
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/help"
                    onClick={toggleMobileMenu}
                    className={({ isActive }) =>
                      `flex items-center p-2 rounded-lg ${
                        isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                      }`
                    }
                  >
                    <QuestionMarkCircleIcon className="w-5 h-5 mr-2" />
                    帮助说明
                  </NavLink>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={toggleMobileMenu}
              className="md:hidden text-gray-500 hover:text-gray-700"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-gray-700 md:hidden">域名管理系统</h2>
            <div className="ml-auto">
              <span className="text-sm text-gray-500">今日日期: {new Date().toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto p-4">
          <Routes>
            <Route path="/" element={<DomainList />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/help" element={<Help />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
