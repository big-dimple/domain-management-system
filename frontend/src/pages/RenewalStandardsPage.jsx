import { useEffect, useCallback } from 'react';
import useSystemStore from '../stores/systemStore';
import { MarkdownRenderer } from '../components/MarkdownRenderer'; // 引入Markdown渲染组件

export default function RenewalStandardsPage() {
  const { renewalStandards, loading, error, fetchRenewalStandards } = useSystemStore();
  
  const stableFetchRenewalStandards = useCallback(() => {
    fetchRenewalStandards();
  }, [fetchRenewalStandards]);

  useEffect(() => {
    stableFetchRenewalStandards(); // 页面加载时获取数据
  }, [stableFetchRenewalStandards]);
  
  return (
    <div>
      <div className="pb-5 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
          续费标准
        </h1>
      </div>
      
      <div className="mt-6 bg-white p-6 rounded-lg shadow">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            <p className="ml-3 text-gray-700">正在加载续费标准...</p>
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
                <p className="text-sm text-red-700">加载续费标准失败: {error}</p>
              </div>
            </div>
          </div>
        ) : renewalStandards ? ( // 确保 renewalStandards 对象存在
          <div>
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-medium text-gray-900">域名续费标准和评估规则</h2>
                <p className="text-sm text-gray-500 mt-1">
                  最后更新于: {renewalStandards.updatedAt ? new Date(renewalStandards.updatedAt).toLocaleString('zh-CN') : '未知'}
                </p>
              </div>
              {/* 可以添加编辑按钮等 */}
            </div>
            
            {/* 使用 MarkdownRenderer 组件渲染内容 */}
            <MarkdownRenderer content={renewalStandards.content} />
          </div>
        ) : (
          <p className="text-gray-500">暂无续费标准内容。</p>
        )}
      </div>
    </div>
  );
}
