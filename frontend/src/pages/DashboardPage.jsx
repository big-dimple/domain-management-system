import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { StatCard } from '../components/StatCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { 
  Globe, Shield, AlertTriangle, Activity, TrendingUp, 
  Clock, CheckCircle, XCircle, DollarSign, Calendar
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const DashboardPage = () => {
  const [overview, setOverview] = useState(null);
  const [stats, setStats] = useState(null);
  const [domains, setDomains] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, statsRes, domainsRes, sslRes] = await Promise.all([
        axios.get('/api/dashboard/overview'),
        axios.get('/api/stats'),
        axios.get('/api/domains?limit=1000'), // 获取所有域名
        axios.get('/api/ssl/certificates?limit=1000') // 获取所有证书
      ]);
      setOverview(overviewRes.data);
      setStats(statsRes.data);
      setDomains(domainsRes.data.data);
      setCertificates(sslRes.data.data);
    } catch (error) {
      console.error('获取数据失败:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // 准备30天到期趋势数据
  const next30DaysData = (() => {
    const data = [];
    const today = dayjs();
    
    // 创建未来30天的数据点
    for (let i = 0; i <= 30; i += 3) { // 每3天一个数据点
      const targetDate = today.add(i, 'day');
      const dateStr = targetDate.format('MM-DD');
      
      // 计算这一天到期的域名数
      const expiringDomains = domains.filter(d => {
        const expiry = dayjs(d.expiryDate);
        return expiry.isSame(targetDate, 'day');
      }).length;
      
      // 计算这一天到期的SSL证书数
      const expiringSSL = certificates.filter(c => {
        const expiry = dayjs(c.validTo);
        return expiry.isSame(targetDate, 'day');
      }).length;
      
      // 计算累计到期数（到这一天为止的所有到期）
      const cumulativeDomains = domains.filter(d => {
        const expiry = dayjs(d.expiryDate);
        return expiry.isAfter(today) && expiry.isBefore(targetDate.add(1, 'day'));
      }).length;
      
      const cumulativeSSL = certificates.filter(c => {
        const expiry = dayjs(c.validTo);
        return expiry.isAfter(today) && expiry.isBefore(targetDate.add(1, 'day'));
      }).length;
      
      data.push({
        date: dateStr,
        day: i,
        domains: expiringDomains,
        ssl: expiringSSL,
        累计域名: cumulativeDomains,
        累计SSL: cumulativeSSL
      });
    }
    
    return data;
  })();

  // 准备域名到期分布数据（按月）
  const expiryDistribution = (() => {
    const distribution = {};
    const today = dayjs();
    
    // 初始化未来12个月
    for (let i = 0; i < 12; i++) {
      const month = today.add(i, 'month');
      const key = month.format('YYYY-MM');
      distribution[key] = { month: month.format('MMM'), domains: 0, ssl: 0 };
    }
    
    // 统计域名
    domains.forEach(domain => {
      const expiry = dayjs(domain.expiryDate);
      if (expiry.isAfter(today)) {
        const key = expiry.format('YYYY-MM');
        if (distribution[key]) {
          distribution[key].domains++;
        }
      }
    });
    
    // 统计SSL
    certificates.forEach(cert => {
      const expiry = dayjs(cert.validTo);
      if (expiry.isAfter(today)) {
        const key = expiry.format('YYYY-MM');
        if (distribution[key]) {
          distribution[key].ssl++;
        }
      }
    });
    
    return Object.values(distribution);
  })();

  // 准备图表数据
  const domainRenewalData = stats?.domain.byRenewalSuggestion || [];
  const sslStatusData = stats?.ssl.byStatus || [];
  
  const pieColors = {
    '紧急续费': '#dc2626',
    '建议续费': '#16a34a',
    '保持续费': '#2563eb',
    '请示领导': '#ca8a04',
    '待评估': '#6b7280',
    '不续费': '#7c3aed',
    'active': '#16a34a',
    'warning': '#ca8a04',
    'critical': '#dc2626',
    'expired': '#6b7280',
    'error': '#7c3aed'
  };

  // 计算即将到期的重要域名列表
  const urgentDomains = domains
    .filter(d => {
      const days = dayjs(d.expiryDate).diff(dayjs(), 'day');
      return days >= 0 && days <= 30;
    })
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
    .slice(0, 10);

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">系统概览</h1>
        <p className="text-gray-600">域名和SSL证书管理系统整体状态</p>
      </div>

      {/* 核心指标卡片 */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard 
            title="域名总数" 
            value={overview.domainTotal} 
            icon={Globe} 
            color="blue" 
          />
          <StatCard 
            title="SSL证书" 
            value={overview.sslTotal} 
            icon={Shield} 
            color="green" 
          />
          <StatCard 
            title="30天内到期" 
            value={overview.domainExpiring30Days + (stats?.ssl.byStatus?.find(s => s._id === 'critical')?.count || 0)} 
            icon={AlertTriangle} 
            color="yellow" 
          />
          <StatCard 
            title="月度续费预算" 
            value={`¥${overview.monthlyBudget.toLocaleString()}`} 
            icon={DollarSign} 
            color="purple" 
          />
        </div>
      )}

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 30天到期趋势图 */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">未来30天到期趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={next30DaysData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="累计域名" 
                stackId="1"
                stroke="#2563eb" 
                fill="#93bbfc" 
              />
              <Area 
                type="monotone" 
                dataKey="累计SSL" 
                stackId="1"
                stroke="#16a34a" 
                fill="#86efac" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 域名续费建议分布 */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">域名续费建议分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={domainRenewalData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ _id, count, percent }) => `${_id}: ${count} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {domainRenewalData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[entry._id] || '#8884d8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 月度到期分布和重要域名列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 未来12个月到期分布 */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">未来12个月到期分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={expiryDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="domains" fill="#2563eb" name="域名" />
              <Bar dataKey="ssl" fill="#16a34a" name="SSL证书" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 即将到期的重要域名 */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
            30天内到期域名 TOP 10
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {urgentDomains.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无即将到期的域名</p>
            ) : (
              urgentDomains.map(domain => {
                const days = dayjs(domain.expiryDate).diff(dayjs(), 'day');
                return (
                  <div key={domain._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex-1">
                      <span className="font-medium text-sm">{domain.domainName}</span>
                      {domain.hasICP && <span className="ml-2 text-xs text-green-600">[ICP]</span>}
                      {domain.hasSpecialValue && <span className="ml-2 text-xs text-purple-600">[重要]</span>}
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${days <= 7 ? 'text-red-600' : days <= 15 ? 'text-orange-600' : 'text-yellow-600'}`}>
                        {days}天
                      </span>
                      <div className="text-xs text-gray-500">
                        {dayjs(domain.expiryDate).format('MM-DD')}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* SSL证书状态分布 */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">SSL证书状态分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={sslStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ _id, count }) => `${_id}: ${count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {sslStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[entry._id] || '#8884d8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 系统状态 */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">系统状态</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">域名扫描</p>
                <p className="font-medium">
                  {stats?.domain.lastScan ? 
                    dayjs(stats.domain.lastScan.endTime).format('MM-DD HH:mm') : 
                    '未执行'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">SSL扫描</p>
                <p className="font-medium">
                  {stats?.ssl.lastScan ? 
                    dayjs(stats.ssl.lastScan.endTime).format('MM-DD HH:mm') : 
                    '未执行'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">告警配置</p>
                <p className="font-medium">{stats?.alertConfigCount || 0} 个已启用</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">下次扫描</p>
                <p className="font-medium">明天 04:30</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
