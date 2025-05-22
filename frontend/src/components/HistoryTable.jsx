import dayjs from 'dayjs'; // 用于日期格式化

// 操作类型到中文名称的映射
const actionTypeMap = {
  CREATE: '创建域名',
  UPDATE: '更新域名',
  DELETE: '删除域名',
  IMPORT: '导入数据',
  RENEWAL_SUGGESTION_UPDATED: '评估续费建议',
  BACKUP: '数据库备份',
  SYSTEM_TASK: '系统任务'
};

// 操作类型对应的Tailwind CSS颜色类
const actionTypeColorMap = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  IMPORT: 'bg-purple-100 text-purple-800',
  RENEWAL_SUGGESTION_UPDATED: 'bg-yellow-100 text-yellow-800',
  BACKUP: 'bg-indigo-100 text-indigo-800',
  SYSTEM_TASK: 'bg-gray-100 text-gray-800',
  DEFAULT: 'bg-gray-100 text-gray-800'
};

export default function HistoryTable({ histories = [], pagination = { page: 1, limit: 20, total: 0, totalPages: 0 }, onPageChange }) {
  
  const renderPaginationButtons = () => {
    // 与 DomainTable 类似的分页逻辑
    const buttons = [];
    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;
    const maxButtons = 5;

    if (totalPages <= 1) return null;

    buttons.push(<button key="first" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="pagination-button rounded-l-md">首页</button>);
    buttons.push(<button key="prev" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="pagination-button">上一页</button>);

    let startPage, endPage;
    if (totalPages <= maxButtons) {
      startPage = 1; endPage = totalPages;
    } else {
      const maxPagesBefore = Math.floor(maxButtons / 2);
      const maxPagesAfter = Math.ceil(maxButtons / 2) - 1;
      if (currentPage <= maxPagesBefore) {
        startPage = 1; endPage = maxButtons;
      } else if (currentPage + maxPagesAfter >= totalPages) {
        startPage = totalPages - maxButtons + 1; endPage = totalPages;
      } else {
        startPage = currentPage - maxPagesBefore; endPage = currentPage + maxPagesAfter;
      }
    }
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(<button key={i} onClick={() => onPageChange(i)} disabled={currentPage === i} className={`pagination-button ${currentPage === i ? 'pagination-button-active' : ''}`}>{i}</button>);
    }
    buttons.push(<button key="next" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-button">下一页</button>);
    buttons.push(<button key="last" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="pagination-button rounded-r-md">末页</button>);
    return buttons;
  };

  const formatDetails = (actionType, details) => {
    if (!details) return '无详情';
    
    try {
      switch (actionType) {
        case 'UPDATE':
          if (details.changedFields && Object.keys(details.changedFields).length > 0) {
            return (
              <details className="max-w-xs cursor-pointer">
                <summary className="text-indigo-600 hover:text-indigo-500 text-xs">查看变更 ({Object.keys(details.changedFields).length}项)</summary>
                <div className="mt-1 p-1.5 bg-gray-50 rounded text-xs space-y-0.5 max-h-24 overflow-y-auto">
                  {Object.entries(details.changedFields).map(([field, values]) => (
                    <div key={field} className="truncate">
                      <span className="font-semibold">{field}:</span> {String(values.old ?? 'N/A')} → {String(values.new ?? 'N/A')}
                    </div>
                  ))}
                  {details.batchOperation && <div className="text-orange-600 text-xs">批量操作</div>}
                  {details.isImport && <div className="text-purple-600 text-xs">CSV导入</div>}
                </div>
              </details>
            );
          }
          return details.batchOperation ? '批量更新' : '无字段变更';
          
        case 'RENEWAL_SUGGESTION_UPDATED':
          const oldSuggestion = details.oldSuggestion || details.newSuggestion || 'N/A';
          const newSuggestion = details.newSuggestion || details.renewalSuggestion || 'N/A';
          const reason = details.newReason || details.renewalSuggestionReason || details.reason || 'N/A';
          
          return (
            <div className="text-xs">
              <div><span className="font-medium">建议:</span> {oldSuggestion} → <span className="text-green-600">{newSuggestion}</span></div>
              {reason && reason !== 'N/A' && <div className="text-gray-500 mt-0.5">原因: {reason}</div>}
              {details.batchOperation && <div className="text-orange-600 mt-0.5">批量评估</div>}
              {details.isSystemTask && <div className="text-blue-600 mt-0.5">系统任务</div>}
            </div>
          );
          
        case 'IMPORT':
          return (
            <div className="text-xs">
              <div><span className="font-medium">文件:</span> {details.filename || 'N/A'}</div>
              {details.stats && (
                <div className="mt-0.5">
                  总计: {details.stats.total || 0}, 新增: {details.stats.success || 0}, 
                  更新: {details.stats.updated || 0}, 失败: {details.stats.failed || 0}
                </div>
              )}
            </div>
          );
          
        case 'BACKUP':
          return (
            <div className="text-xs">
              <div><span className="font-medium">时间:</span> {details.timestamp ? dayjs(details.timestamp).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}</div>
              {details.stats && (
                <div className="mt-0.5">
                  域名: {details.stats.domains || 0}, 历史: {details.stats.histories || 0}
                </div>
              )}
              {details.files && details.files.length > 0 && (
                <div className="mt-0.5 text-gray-500">文件: {details.files.length}个</div>
              )}
            </div>
          );
          
        case 'SYSTEM_TASK':
          if (details.task === 'checkExpiries' && details.summary) {
            return (
              <div className="text-xs">
                <div><span className="font-medium">任务:</span> 检查域名到期</div>
                <div className="mt-0.5">
                  总计: {details.summary.total || 0}, 更新: {details.summary.updated || 0}, 
                  错误: {details.summary.errors?.length || 0}
                </div>
              </div>
            );
          } else if (details.task === 'createDefaultRenewalStandards') {
            return '创建默认续费标准文档';
          } else if (details.task) {
            return `系统任务: ${details.task}`;
          }
          return '系统级操作';
          
        case 'CREATE':
          return details.isImport ? 'CSV导入创建' : (details.batchOperation ? '批量创建' : '创建新域名');
          
        case 'DELETE':
          return details.batchOperation ? '批量删除' : '删除域名';
          
        default:
          // 对于未知类型，尝试显示关键信息
          if (typeof details === 'object') {
            const keys = Object.keys(details);
            if (keys.length <= 3) {
              return keys.map(key => `${key}: ${details[key]}`).join(', ');
            } else {
              return (
                <details className="max-w-xs cursor-pointer">
                  <summary className="text-indigo-600 hover:text-indigo-500 text-xs">查看详情</summary>
                  <pre className="mt-1 p-1.5 bg-gray-50 rounded text-xs max-h-24 overflow-y-auto whitespace-pre-wrap">
                    {JSON.stringify(details, null, 2).substring(0, 300)}
                    {JSON.stringify(details, null, 2).length > 300 ? '...' : ''}
                  </pre>
                </details>
              );
            }
          }
          return String(details).substring(0, 100) + (String(details).length > 100 ? "..." : "");
      }
    } catch (error) {
      console.warn('格式化历史详情时出错:', error);
      return '详情格式错误';
    }
  };

  return (
    <div className="flex flex-col">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">时间</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">相关域名</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">操作类型</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">用户</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">详情</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {histories.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-sm text-gray-500">
                      没有找到匹配的历史记录。
                    </td>
                  </tr>
                ) : (
                  histories.map((history) => (
                    <tr key={history._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dayjs(history.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-xs" title={history.domainName}>
                        {history.domainName || '系统级操作'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${actionTypeColorMap[history.actionType] || actionTypeColorMap.DEFAULT}`}>
                          {actionTypeMap[history.actionType] || history.actionType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {history.user || 'system'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-md"> {/* 使用max-w-md并允许内容换行 */}
                        <div className="whitespace-normal break-words">{formatDetails(history.actionType, history.details)}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* 分页 */}
      {pagination && pagination.total > 0 && (
         <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
          <div className="flex-1 flex justify-between sm:hidden"> {/* 移动端简单分页 */}
            <button onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page === 1} className="pagination-button">上一页</button>
            <button onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} className="pagination-button">下一页</button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between"> {/* 桌面端完整分页 */}
            <div>
              <p className="text-sm text-gray-700">
                显示第 <span className="font-medium">{Math.max(1, (pagination.page - 1) * pagination.limit + 1)}</span> 到 <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> 项，共 <span className="font-medium">{pagination.total}</span> 项结果
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                {renderPaginationButtons()}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
