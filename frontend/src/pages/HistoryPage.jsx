import { useEffect, useState, useCallback } from 'react';
import useHistoryStore from '../stores/historyStore';
import HistoryTable from '../components/HistoryTable'; // 引入历史记录表格组件

export default function HistoryPage() {
  const {
    histories,
    loading,
    error,
    pagination,
    filters, // 当前筛选条件
    fetchHistories,
    setPage,
    setFilters,
    resetFilters
  } = useHistoryStore();
  
  // 使用 useCallback 包装 fetchHistories
  const stableFetchHistories = useCallback(() => {
    fetchHistories();
  }, [fetchHistories]);

  useEffect(() => {
    stableFetchHistories(); // 页面加载时获取数据
  }, [stableFetchHistories]);
  
  // 用于表单输入的本地状态
  const [searchQuery, setSearchQuery] = useState(filters.domainName || '');
  const [actionTypeFilter, setActionTypeFilter] = useState(filters.actionType || '');
  
  // 当全局筛选条件变化时，同步本地表单状态 (例如通过浏览器历史返回)
  useEffect(() => {
    setSearchQuery(filters.domainName || '');
    setActionTypeFilter(filters.actionType || '');
  }, [filters]);

  // 处理搜索表单提交
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters({ domainName: searchQuery, actionType: actionTypeFilter });
  };
  
  // 处理重置筛选
  const handleResetFilters = () => {
    setSearchQuery('');      // 清空本地表单
    setActionTypeFilter(''); // 清空本地表单
    resetFilters();          // 调用store的重置方法
  };
  
  return (
    <div>
      <div className="pb-5 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
          历史记录
        </h1>
      </div>
      
      {/* 搜索与筛选区域 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <form onSubmit={handleSearchSubmit} className="space-y-4 md:space-y-0 md:flex md:items-end md:space-x-4">
          <div className="flex-1">
            <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700">
              域名搜索
            </label>
            <input
              type="text"
              id="searchQuery"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="输入相关域名进行搜索"
            />
          </div>
          
          <div className="w-full md:w-auto">
            <label htmlFor="actionType" className="block text-sm font-medium text-gray-700">
              操作类型
            </label>
            <select
              id="actionType"
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">所有操作类型</option>
              <option value="CREATE">创建</option>
              <option value="UPDATE">更新</option>
              <option value="DELETE">删除</option>
              <option value="IMPORT">导入</option>
              <option value="RENEWAL_SUGGESTION_UPDATED">更新续费建议</option>
              <option value="BACKUP">备份</option>
            </select>
          </div>
          
          <div className="flex space-x-3 pt-1 md:pt-0">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              搜索
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              重置
            </button>
          </div>
        </form>
      </div>
      
      {/* 历史记录表格 */}
      {loading && histories.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
           <p className="ml-3 text-gray-700">正在加载历史记录...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
               <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">加载历史记录失败: {error}</p>
            </div>
          </div>
        </div>
      ) : (
        <HistoryTable
          histories={histories}
          pagination={pagination}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
