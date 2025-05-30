import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Globe, Shield, Bell, HelpCircle, ChevronLeft, ChevronRight,
  Server, Settings, LogOut, BarChart3, Menu
} from 'lucide-react';

export const ModernLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // 映射路由到菜单ID
  const getActivePageFromPath = (path) => {
    if (path === '/') return 'domains';
    if (path === '/ssl') return 'ssl';
    if (path === '/alerts') return 'alerts';
    if (path === '/help') return 'help';
    if (path === '/dashboard') return 'dashboard';
    return 'domains';
  };
  
  const activePage = getActivePageFromPath(location.pathname);
  
  const menuItems = [
    { id: 'dashboard', label: '概览', icon: BarChart3, path: '/dashboard' },
    { id: 'domains', label: '域名管理', icon: Globe, path: '/' },
    { id: 'ssl', label: 'SSL监控', icon: Shield, path: '/ssl' },
    { id: 'alerts', label: '告警中心', icon: Bell, path: '/alerts' },
    { id: 'help', label: '帮助文档', icon: HelpCircle, path: '/help' },
  ];

  const handleNavigate = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* 移动端菜单按钮 */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* 侧边栏 */}
      <div className={`${collapsed ? 'w-16' : 'w-64'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative bg-white border-r border-gray-200 h-full transition-all duration-300 flex flex-col z-40 sidebar`}>
        {/* Logo区域 */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <Server className="w-6 h-6 text-blue-600" />
              <span className="font-semibold text-gray-900">DomainHub</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors hidden md:block"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* 菜单项 */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`sidebar-item w-full ${isActive ? 'active' : ''}`}
              >
                <Icon className={`${collapsed ? 'w-5 h-5 mx-auto' : 'w-5 h-5 mr-3'} flex-shrink-0`} />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* 底部用户区域 */}
        <div className="p-4 border-t border-gray-200">
          {collapsed ? (
            <button className="p-2 rounded-md hover:bg-gray-100 w-full">
              <Settings className="w-5 h-5 mx-auto text-gray-600" />
            </button>
          ) : (
            <div className="space-y-2">
              <button className="sidebar-item w-full">
                <Settings className="w-5 h-5 mr-3" />
                <span className="text-sm">设置</span>
              </button>
              <button className="sidebar-item w-full">
                <LogOut className="w-5 h-5 mr-3" />
                <span className="text-sm">退出</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>

      {/* 移动端遮罩 */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};
