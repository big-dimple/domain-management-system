import { useEffect, useCallback } from 'react';
import useDashboardStore from '../stores/dashboardStore';
import DomainTypeChart from '../components/Dashboard/DomainTypeChart';
import RenewalSuggestionChart from '../components/Dashboard/RenewalSuggestionChart';
import ExpiryTrendChart from '../components/Dashboard/ExpiryTrendChart';
import UrgentDomainsCard from '../components/Dashboard/UrgentDomainsCard';
import { ArrowPathIcon, GlobeAltIcon, ShieldCheckIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'; // 更新图标

export default function DashboardPage() {
  const { stats, loading, error, fetchStats } = useDashboardStore();
  
  const stableFetchStats = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    stableFetchStats(); // 页面加载时获取数据
  }, [stableFetchStats]);
  
  if (loading && !stats) { // 初始加载时显示
    return (
      <div className="flex flex-col items-center justify-center h-80">
        <ArrowPathIcon className="animate-spin h-12 w-12 text-indigo-600" />
        <p className="mt-3 text-gray-700">正在加载仪表盘数据...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">加载仪表盘数据失败: {error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!stats) { // 如果加载完成但stats仍为空
    return (
      <div className="text-center py-10">
        <p className="text-lg text-gray-500">暂无仪表盘数据可显示。</p>
        <p className="text-sm text-gray-400 mt-2">请尝试添加一些域名或稍后再试。</p>
      </div>
    );
  }
  
  // 提取关键统计数据，提供默认值以防万一
  const totalDomains = stats.totalDomains || 0;
  const expiringIn30Days = stats.expiryTrend?.['30天内'] || 0;
  const suggestedForRenewal = stats.renewalSuggestionDistribution?.find(item => item.suggestion === '建议续费')?.count || 0;
  const pendingEvaluation = stats.renewalSuggestionDistribution?.find(item => item.suggestion === '待评估')?.count || 0;

  return (
    <div>
      <div className="pb-5 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
          仪表盘概览
        </h1>
      </div>
      
      {/* 统计卡片 */}
      <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">总域名数</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 flex items-center">
            <GlobeAltIcon className="h-8 w-8 text-indigo-600 mr-2" />
            {totalDomains}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">30天内到期</dt>
          <dd className={`mt-1 text-3xl font-semibold tracking-tight ${expiringIn30Days > 0 ? 'text-red-600' : 'text-gray-900'} flex items-center`}>
            <ClockIcon className={`h-8 w-8 ${expiringIn30Days > 0 ? 'text-red-500' : 'text-orange-500'} mr-2`} />
            {expiringIn30Days}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">建议续费</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 flex items-center">
            <ShieldCheckIcon className="h-8 w-8 text-green-500 mr-2" />
            {suggestedForRenewal}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">待评估</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 flex items-center">
             <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500 mr-2" />
            {pendingEvaluation}
          </dd>
        </div>
      </dl>
      
      {/* 图表区域 */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {stats.domainTypeDistribution && stats.domainTypeDistribution.length > 0 ? 
          <DomainTypeChart data={stats.domainTypeDistribution} /> : 
          <div className="bg-white p-4 rounded-lg shadow h-80 flex items-center justify-center text-gray-500">域名类型分布数据不足</div>}
        
        {stats.renewalSuggestionDistribution && stats.renewalSuggestionDistribution.length > 0 ?
          <RenewalSuggestionChart data={stats.renewalSuggestionDistribution} /> :
          <div className="bg-white p-4 rounded-lg shadow h-80 flex items-center justify-center text-gray-500">续费建议分布数据不足</div>}
      </div>
      
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {stats.expiryTrend && Object.keys(stats.expiryTrend).length > 0 ?
          <ExpiryTrendChart data={stats.expiryTrend} /> :
          <div className="bg-white p-4 rounded-lg shadow h-80 flex items-center justify-center text-gray-500">域名到期趋势数据不足</div>}
        
        {stats.urgentDomains && stats.urgentDomains.length > 0 ?
          <UrgentDomainsCard domains={stats.urgentDomains} /> :
          <div className="bg-white p-4 rounded-lg shadow h-full min-h-[20rem] flex items-center justify-center text-gray-500">无紧急关注的域名</div>}
      </div>
    </div>
  );
}
