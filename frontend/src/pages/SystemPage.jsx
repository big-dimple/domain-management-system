import { useEffect, useState, useCallback } from 'react';
import useSystemStore from '../stores/systemStore';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, CircleStackIcon, DocumentDuplicateIcon, PlayIcon } from '@heroicons/react/20/solid'; // 更新图标

export default function SystemPage() {
  const {
    healthStatus,
    backupStatus, // 从 store 获取备份状态
    loading: systemLoading, // 重命名以避免与本地loading冲突
    error: systemError,     // 重命名
    checkHealth,
    checkExpiries,
    backupDatabase
  } = useSystemStore();
  
  const [autoRefreshIntervalId, setAutoRefreshIntervalId] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [isCheckingExpiries, setIsCheckingExpiries] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const stableCheckHealth = useCallback(() => {
    checkHealth();
    setLastRefreshed(new Date());
  }, [checkHealth]);

  useEffect(() => {
    stableCheckHealth(); // 初始加载健康状态
    
    return () => { // 组件卸载时清除定时器
      if (autoRefreshIntervalId) {
        clearInterval(autoRefreshIntervalId);
      }
    };
  }, [stableCheckHealth, autoRefreshIntervalId]); // autoRefreshIntervalId 加入依赖，以便在它变化时正确处理
  
  const toggleAutoRefresh = () => {
    if (autoRefreshIntervalId) {
      clearInterval(autoRefreshIntervalId);
      setAutoRefreshIntervalId(null);
      toast.success('已停止自动刷新系统状态。');
    } else {
      const intervalId = setInterval(() => {
        stableCheckHealth();
      }, 30000); // 每30秒刷新一次
      setAutoRefreshIntervalId(intervalId);
      toast.success('已开启系统状态自动刷新 (每30秒)。');
    }
  };
  
  const handleCheckExpiries = async () => {
    setIsCheckingExpiries(true);
    const result = await checkExpiries(); // store 中的 action 会处理 toast
    // if (result.success) {
    //   toast.success(`域名检查完成: 共${result.data.total}个域名，更新了${result.data.updated}个域名的续费建议`);
    // } else {
    //   toast.error('域名检查失败');
    // }
    setIsCheckingExpiries(false);
  };
  
  const handleBackupDatabase = async () => {
    setIsBackingUp(true);
    const result = await backupDatabase(); // store 中的 action 会处理 toast
    // if (result.success) {
    //   toast.success(`数据库备份成功: ${result.data.timestamp}`);
    // } else {
    //   toast.error('数据库备份失败');
    // }
    setIsBackingUp(false);
  };
  
  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  return (
    <div>
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
          系统状态与维护
        </h1>
        <div className="mt-3 sm:mt-0 sm:ml-4 flex space-x-3">
          <button
            type="button"
            onClick={stableCheckHealth} // 直接调用稳定版的刷新函数
            disabled={systemLoading}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`-ml-0.5 mr-1.5 h-5 w-5 ${systemLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            刷新状态
          </button>
          <button
            type="button"
            onClick={toggleAutoRefresh}
            className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm ${
              autoRefreshIntervalId
                ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-300 hover:bg-red-100'
                : 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-300 hover:bg-green-100'
            }`}
          >
            {autoRefreshIntervalId ? '停止自动刷新' : '开启自动刷新'}
          </button>
        </div>
      </div>
      
      {/* 加载与错误提示 (全局的，由 systemStore 控制) */}
      {systemLoading && !healthStatus && ( // 初始加载时显示
        <div className="my-4 p-4 bg-indigo-50 text-indigo-700 rounded-md flex items-center">
          <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />
          <span>正在加载系统信息...</span>
        </div>
      )}
      {systemError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4 rounded-md">
          <p className="text-sm text-red-700">加载系统信息失败: {systemError}</p>
        </div>
      )}
      
      {/* 操作卡片 */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <PlayIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">检查域名到期</h3>
                <p className="mt-1 text-sm text-gray-500">
                  手动触发系统检查所有域名的到期状态并更新续费建议。
                </p>
              </div>
            </div>
            <div className="mt-5 text-right">
              <button
                type="button"
                onClick={handleCheckExpiries}
                disabled={isCheckingExpiries || systemLoading}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
              >
                {isCheckingExpiries ? '检查中...' : '开始检查'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <DocumentDuplicateIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                 <h3 className="text-lg font-medium text-gray-900">备份数据库</h3>
                <p className="mt-1 text-sm text-gray-500">
                  创建当前所有域名数据和历史记录的备份文件。
                </p>
              </div>
            </div>
            <div className="mt-5 text-right">
              <button
                type="button"
                onClick={handleBackupDatabase}
                disabled={isBackingUp || systemLoading}
                className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50"
              >
                {isBackingUp ? '备份中...' : '开始备份'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 健康状态详情 */}
      {healthStatus && (
        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">系统健康状态</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                系统的实时运行状态和关键性能指标。
              </p>
            </div>
            <div className="text-sm text-gray-500">
              最后刷新: {lastRefreshed ? lastRefreshed.toLocaleString('zh-CN') : 'N/A'}
            </div>
          </div>
          <dl className="divide-y divide-gray-200">
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">服务器状态</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
                <span className={`h-3 w-3 rounded-full ${healthStatus.server?.uptime > 0 ? 'bg-green-400' : 'bg-red-400'} mr-2`}></span>
                <span>{healthStatus.server?.uptime > 0 ? '运行中' : '未知'}</span>
                {healthStatus.server?.uptime > 0 && <span className="ml-2 text-gray-500">(已运行: {Math.floor(healthStatus.server.uptime / 3600)}h {Math.floor((healthStatus.server.uptime % 3600) / 60)}m {Math.floor(healthStatus.server.uptime % 60)}s)</span>}
              </dd>
            </div>
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">数据库连接</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
                <span className={`h-3 w-3 rounded-full ${healthStatus.database?.connected ? 'bg-green-400' : 'bg-red-400'} mr-2`}></span>
                <span>{healthStatus.database?.connected ? '已连接' : '未连接'}</span>
              </dd>
            </div>
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">域名总数</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {healthStatus.database?.stats?.domainsCount ?? 'N/A'} 个
              </dd>
            </div>
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">30天内到期域名</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className={(healthStatus.database?.stats?.expiringCount ?? 0) > 0 ? 'text-red-600 font-semibold' : ''}>
                  {healthStatus.database?.stats?.expiringCount ?? 'N/A'} 个
                </span>
              </dd>
            </div>
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">内存使用 (RSS)</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {healthStatus.server?.memory?.rss ? formatBytes(parseInt(healthStatus.server.memory.rss.replace(' MB', '') * 1024 * 1024)) : 'N/A'}
              </dd>
            </div>
             <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">堆内存使用</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                 {healthStatus.server?.memory?.heapUsed ? formatBytes(parseInt(healthStatus.server.memory.heapUsed.replace(' MB', '') * 1024 * 1024)) : 'N/A'} / {healthStatus.server?.memory?.heapTotal ? formatBytes(parseInt(healthStatus.server.memory.heapTotal.replace(' MB', '') * 1024 * 1024)) : 'N/A'}
              </dd>
            </div>
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Node.js 版本</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {healthStatus.server?.node ?? 'N/A'}
              </dd>
            </div>
          </dl>
        </div>
      )}
      
      {/* 最近备份状态 */}
      {backupStatus && (
        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">最近备份信息</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              显示最近一次数据库备份的详细情况。
            </p>
          </div>
           <dl className="divide-y divide-gray-200">
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">备份时间</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {backupStatus.timestamp ? new Date(backupStatus.timestamp).toLocaleString('zh-CN') : 'N/A'}
              </dd>
            </div>
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">备份文件</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {backupStatus.files && backupStatus.files.length > 0 ? (
                  <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                    {backupStatus.files.map((file, index) => (
                      <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                        <div className="w-0 flex-1 flex items-center">
                          <CircleStackIcon className="flex-shrink-0 h-5 w-5 text-gray-400" aria-hidden="true" />
                          <span className="ml-2 flex-1 w-0 truncate">{file}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : '无备份文件信息'}
              </dd>
            </div>
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">备份统计</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {backupStatus.stats ? (
                  <div className="space-y-1">
                    <div>域名数量: {backupStatus.stats.domains ?? 'N/A'}</div>
                    <div>历史记录数量: {backupStatus.stats.histories ?? 'N/A'}</div>
                  </div>
                ) : '无统计信息'}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
