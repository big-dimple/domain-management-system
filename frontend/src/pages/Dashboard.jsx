import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { format, addMonths, differenceInMonths, parseISO } from 'date-fns';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// 状态卡片组件
const StatCard = ({ title, value, icon, color }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 flex items-center ${color}`}>
      <div className="mr-4">{icon}</div>
      <div>
        <h3 className="text-lg text-gray-600">{title}</h3>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </div>
  );
};

// 图表卡片组件
const ChartCard = ({ title, children }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-medium text-gray-700 mb-4">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
};

// 主仪表盘组件
const Dashboard = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    expiring: 0,
    withIcp: 0,
    inUse: 0,
  });

  // 获取数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/domains');
        setDomains(response.data);

        // 计算统计数据
        const now = new Date();
        const expiringCount = response.data.filter(domain => {
          const expiryDate = new Date(domain.expiryDate);
          return differenceInMonths(expiryDate, now) <= 3;
        }).length;

        const withIcpCount = response.data.filter(domain => domain.icpRegistration).length;
        
        const inUseCount = response.data.filter(domain => 
          domain.usage && domain.usage !== '未使用' && domain.usage !== '无使用'
        ).length;

        setStats({
          total: response.data.length,
          expiring: expiringCount,
          withIcp: withIcpCount,
          inUse: inUseCount,
        });
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 准备域名类型分布数据
  const domainTypeData = {
    labels: ['gTLD', 'ccTLD', 'New gTLD'],
    datasets: [
      {
        label: '域名数量',
        data: [
          domains.filter(d => d.type === 'gTLD').length,
          domains.filter(d => d.type === 'ccTLD').length,
          domains.filter(d => d.type === 'New gTLD').length,
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // 准备域名持有者分布数据
  const domainHolderData = () => {
    // 统计每个持有者的域名数量
    const holderCounts = domains.reduce((acc, domain) => {
      const holder = domain.holder;
      if (!acc[holder]) {
        acc[holder] = 0;
      }
      acc[holder]++;
      return acc;
    }, {});

    // 获取前5个持有者，其余归为"其他"
    const sortedHolders = Object.entries(holderCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    const otherCount = Object.values(holderCounts)
      .reduce((sum, count, index) => {
        if (index >= 5) return sum + count;
        return sum;
      }, 0);

    const labels = sortedHolders.map(([holder]) => holder);
    if (otherCount > 0) labels.push('其他');

    const data = sortedHolders.map(([, count]) => count);
    if (otherCount > 0) data.push(otherCount);

    // 生成颜色
    const backgroundColor = [
      'rgba(54, 162, 235, 0.6)',
      'rgba(75, 192, 192, 0.6)',
      'rgba(255, 206, 86, 0.6)',
      'rgba(255, 99, 132, 0.6)',
      'rgba(153, 102, 255, 0.6)',
      'rgba(255, 159, 64, 0.6)',
    ];

    const borderColor = backgroundColor.map(color => color.replace('0.6', '1'));

    return {
      labels,
      datasets: [
        {
          label: '域名数量',
          data,
          backgroundColor,
          borderColor,
          borderWidth: 1,
        },
      ],
    };
  };

  // 准备到期日期分布数据
  const expiryDateData = () => {
    const now = new Date();
    const categories = [
      { label: '1个月内', months: 1 },
      { label: '3个月内', months: 3 },
      { label: '6个月内', months: 6 },
      { label: '1年内', months: 12 },
      { label: '1年以上', months: Infinity },
    ];

    const counts = categories.map(category => {
      return domains.filter(domain => {
        const expiryDate = new Date(domain.expiryDate);
        const monthsUntilExpiry = differenceInMonths(expiryDate, now);
        return monthsUntilExpiry <= category.months && 
               (category.label === '1个月内' || monthsUntilExpiry > categories[categories.indexOf(category) - 1].months);
      }).length;
    });

    return {
      labels: categories.map(c => c.label),
      datasets: [
        {
          label: '域名数量',
          data: counts,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  // 准备使用情况分布数据
  const usageData = () => {
    // 统计使用情况
    const usageStats = domains.reduce((acc, domain) => {
      const usage = domain.usage && domain.usage !== '' ? domain.usage : '未指定';
      if (!acc[usage]) {
        acc[usage] = 0;
      }
      acc[usage]++;
      return acc;
    }, {});

    // 获取前5个使用情况，其余归为"其他"
    const sortedUsages = Object.entries(usageStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    const otherCount = Object.values(usageStats)
      .reduce((sum, count, index) => {
        if (index >= 5) return sum + count;
        return sum;
      }, 0);

    const labels = sortedUsages.map(([usage]) => usage);
    if (otherCount > 0) labels.push('其他');

    const data = sortedUsages.map(([, count]) => count);
    if (otherCount > 0) data.push(otherCount);

    // 生成颜色
    const backgroundColor = [
      'rgba(75, 192, 192, 0.6)',
      'rgba(255, 99, 132, 0.6)',
      'rgba(255, 206, 86, 0.6)',
      'rgba(153, 102, 255, 0.6)',
      'rgba(54, 162, 235, 0.6)',
      'rgba(255, 159, 64, 0.6)',
    ];

    const borderColor = backgroundColor.map(color => color.replace('0.6', '1'));

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderColor,
          borderWidth: 1,
        },
      ],
    };
  };

  // 准备月度到期趋势数据
  const expiryTrendData = () => {
    // 获取未来12个月
    const months = [];
    const counts = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const monthDate = addMonths(now, i);
      const monthLabel = format(monthDate, 'yyyy-MM');
      months.push(monthLabel);
      
      // 计算每月到期的域名数量
      const monthCount = domains.filter(domain => {
        const expiryDate = new Date(domain.expiryDate);
        return (
          expiryDate.getMonth() === monthDate.getMonth() && 
          expiryDate.getFullYear() === monthDate.getFullYear()
        );
      }).length;
      
      counts.push(monthCount);
    }

    return {
      labels: months,
      datasets: [
        {
          label: '到期域名数量',
          data: counts,
          fill: false,
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          tension: 0.1,
        },
      ],
    };
  };

  // 加载状态
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">域名管理仪表盘</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="总域名数量"
          value={stats.total}
          icon={<svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>}
          color="border-l-4 border-blue-500"
        />
        <StatCard
          title="3个月内到期"
          value={stats.expiring}
          icon={<svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
          color="border-l-4 border-amber-500"
        />
        <StatCard
          title="已ICP备案"
          value={stats.withIcp}
          icon={<svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
          color="border-l-4 border-green-500"
        />
        <StatCard
          title="正在使用"
          value={stats.inUse}
          icon={<svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg>}
          color="border-l-4 border-purple-500"
        />
      </div>

      {/* 图表 - 第一行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="域名类型分布">
          <Pie data={domainTypeData} options={{ maintainAspectRatio: false }} />
        </ChartCard>
        <ChartCard title="业务使用情况分布">
          <Pie data={usageData()} options={{ maintainAspectRatio: false }} />
        </ChartCard>
      </div>

      {/* 图表 - 第二行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="域名持有者分布">
          <Bar 
            data={domainHolderData()} 
            options={{ 
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            }} 
          />
        </ChartCard>
        <ChartCard title="到期时间分布">
          <Bar 
            data={expiryDateData()} 
            options={{ 
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            }} 
          />
        </ChartCard>
      </div>

      {/* 图表 - 趋势 */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <ChartCard title="未来12个月域名到期趋势">
          <Line 
            data={expiryTrendData()} 
            options={{ 
              maintainAspectRatio: false,
              plugins: {
                tooltip: {
                  mode: 'index',
                  intersect: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            }} 
          />
        </ChartCard>
      </div>

      {/* 域名分析和建议 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-700 mb-4">域名分析与建议</h3>
        <div className="space-y-4">
          {/* 即将到期预警 */}
          {stats.expiring > 0 && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
              <h4 className="font-medium text-amber-800">到期预警</h4>
              <p className="text-amber-700">
                有 {stats.expiring} 个域名将在3个月内到期，请及时检查并续费重要域名。
              </p>
            </div>
          )}

          {/* 持有者集中分析 */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h4 className="font-medium text-blue-800">持有者分析</h4>
            <p className="text-blue-700">
              域名主要集中在 {domainHolderData().labels.slice(0, 3).join('、')} 等持有者名下。
              建议检查持有者信息的准确性和完整性，确保域名资产管理清晰。
            </p>
          </div>

          {/* 使用情况分析 */}
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <h4 className="font-medium text-green-800">使用情况分析</h4>
            <p className="text-green-700">
              {domains.filter(d => d.usage === '未使用' || d.usage === '' || d.usage === '无').length} 个域名当前未被使用。
              考虑评估这些闲置域名的保留价值，可能有优化续费成本的空间。
            </p>
          </div>

          {/* ICP备案分析 */}
          <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
            <h4 className="font-medium text-purple-800">ICP备案分析</h4>
            <p className="text-purple-700">
              已有 {stats.withIcp} 个域名完成ICP备案。
              {domains.filter(d => d.usage !== '未使用' && !d.icpRegistration).length > 0 && 
                `有 ${domains.filter(d => d.usage !== '未使用' && !d.icpRegistration).length} 个正在使用的域名尚未备案，建议检查是否需要补办备案。`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
