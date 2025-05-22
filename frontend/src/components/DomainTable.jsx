import { useState, useEffect, useRef, forwardRef } from 'react';
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon // 用于"评估续费"操作
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
// import useDomainStore from '../stores/domainStore'; // 已在 DomainListPage 中传递 currentSort

// 自定义单元格组件 - 续费建议
const RenewalSuggestionCell = ({ value }) => {
  const getColorClass = () => {
    switch (value) {
      case '建议续费': return 'bg-green-100 text-green-800';
      case '可不续费': return 'bg-orange-100 text-orange-800'; // 橙色表示可不续费
      case '不续费': return 'bg-red-100 text-red-800 font-semibold'; // 红色加粗表示明确不续费
      case '请示领导': return 'bg-yellow-100 text-yellow-800';
      case '待评估': default: return 'bg-gray-100 text-gray-800';
    }
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getColorClass()}`}>
      {value || 'N/A'}
    </span>
  );
};

// 自定义单元格组件 - 到期日期
const ExpiryDateCell = ({ value }) => {
  if (!value) return <span className="text-gray-500">N/A</span>;
  const date = dayjs(value);
  const now = dayjs();
  const daysRemaining = date.diff(now, 'day');
  
  let className = 'text-gray-700';
  let suffix = '';

  if (daysRemaining < 0) {
    className = 'text-red-600 font-bold';
    suffix = `(已过期 ${Math.abs(daysRemaining)} 天)`;
  } else if (daysRemaining <= 30) {
    className = 'text-red-500 font-semibold';
    suffix = `(${daysRemaining} 天后)`;
  } else if (daysRemaining <= 60) {
    className = 'text-orange-500';
    suffix = `(${daysRemaining} 天后)`;
  } else if (daysRemaining <= 90) {
    className = 'text-yellow-600';
    suffix = `(${daysRemaining} 天后)`;
  }
  
  return (
    <span className={className}>
      {date.format('YYYY/MM/DD')}
      {suffix && <span className="ml-1 text-xs">{suffix}</span>}
    </span>
  );
};

// 自定义复选框组件 (支持半选状态)
const IndeterminateCheckbox = forwardRef(
  ({ indeterminate, className = '', ...rest }, ref) => {
    const defaultRef = useRef(null);
    const resolvedRef = ref || defaultRef;

    useEffect(() => {
      if (typeof resolvedRef === 'object' && resolvedRef.current) {
        resolvedRef.current.indeterminate = indeterminate ?? false;
      }
    }, [resolvedRef, indeterminate]);

    return (
      <input
        type="checkbox"
        ref={resolvedRef}
        className={`h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${className}`}
        {...rest}
      />
    );
  }
);
IndeterminateCheckbox.displayName = 'IndeterminateCheckbox'; // 添加 displayName

export default function DomainTable({ 
  domains = [], // 提供默认空数组
  pagination = { page: 1, limit: 20, total: 0, totalPages: 0 }, // 提供默认分页对象
  currentSort = { field: 'domainName', order: 'asc' }, // 当前排序状态
  onPageChange, 
  onSort, // 处理排序的函数 (field, order) => void
  onEdit, 
  onDelete, 
  onEvaluate,
  onBatchOperation
}) {
  const [selectedIds, setSelectedIds] = useState([]); // 只存储ID以优化性能
  
  // 处理排序变化
  const handleSort = (field) => {
    if (!onSort) return; // 如果没有传递 onSort 函数，则不执行任何操作
    const newOrder = (field === currentSort.field && currentSort.order === 'asc') ? 'desc' : 'asc';
    onSort(field, newOrder); // 调用父组件传递的排序处理函数
  };
  
  // 处理行选择
  const handleSelectRow = (domainId, isSelected) => {
    setSelectedIds(prev => 
      isSelected ? [...prev, domainId] : prev.filter(id => id !== domainId)
    );
  };
  
  // 处理全选/取消全选
  const handleSelectAllRows = (isSelected) => {
    setSelectedIds(isSelected ? domains.map(d => d._id) : []);
  };
  
  // 当域名数据或分页变化时，清空已选中的行
  useEffect(() => {
    setSelectedIds([]);
  }, [domains, pagination.page]);
  
  const selectedRowCount = selectedIds.length;
  const isAllSelected = domains.length > 0 && selectedRowCount === domains.length;
  const isIndeterminate = selectedRowCount > 0 && selectedRowCount < domains.length;

  const renderPaginationButtons = () => {
    const buttons = [];
    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;
    const maxButtons = 5; // 最多显示的页码按钮数（不含首尾、前后页）

    if (totalPages <= 1) return null;

    // 首页和上一页
    buttons.push(
      <button key="first" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="pagination-button rounded-l-md">首页</button>,
      <button key="prev" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="pagination-button">上一页</button>
    );

    let startPage, endPage;
    if (totalPages <= maxButtons) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const maxPagesBeforeCurrentPage = Math.floor(maxButtons / 2);
      const maxPagesAfterCurrentPage = Math.ceil(maxButtons / 2) - 1;
      if (currentPage <= maxPagesBeforeCurrentPage) {
        startPage = 1;
        endPage = maxButtons;
      } else if (currentPage + maxPagesAfterCurrentPage >= totalPages) {
        startPage = totalPages - maxButtons + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - maxPagesBeforeCurrentPage;
        endPage = currentPage + maxPagesAfterCurrentPage;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button key={i} onClick={() => onPageChange(i)} disabled={currentPage === i} className={`pagination-button ${currentPage === i ? 'pagination-button-active' : ''}`}>{i}</button>
      );
    }

    // 下一页和末页
    buttons.push(
      <button key="next" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-button">下一页</button>,
      <button key="last" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="pagination-button rounded-r-md">末页</button>
    );
    return buttons;
  };


  const tableHeaders = [
    { key: 'domainName', label: '域名', sortable: true, className: "w-1/6" },
    { key: 'domainType', label: '类型', sortable: true, className: "w-1/12" },
    { key: 'holder', label: '持有者', sortable: true, className: "w-1/6" },
    { key: 'expiryDate', label: '到期日期', sortable: true, className: "w-1/6" },
    { key: 'renewalPriceRaw', label: '续费价格', sortable: false, className: "w-1/12" }, // 假设价格不排序
    { key: 'resolverProvider', label: '解析管理', sortable: false, className: "w-1/12" },
    { key: 'icpStatus', label: 'ICP证', sortable: false, className: "w-1/12" },
    { key: 'renewalSuggestion', label: '续费建议', sortable: true, className: "w-1/6" },
    { key: 'actions', label: '操作', sortable: false, className: "w-1/12 text-center" },
  ];

  return (
    <div className="flex flex-col mt-4">
      {selectedRowCount > 0 && (
        <div className="bg-indigo-50 p-3 mb-4 rounded-lg shadow flex items-center justify-between border border-indigo-200">
          <span className="text-sm text-indigo-700">
            已选择 <span className="font-semibold">{selectedRowCount}</span> 项域名
          </span>
          <div className="flex space-x-2">
            <button
              className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 shadow-sm"
              onClick={() => onBatchOperation('delete', selectedIds)}
            >
              批量删除
            </button>
            <button
              className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 shadow-sm"
              onClick={() => onBatchOperation('evaluate', selectedIds)}
            >
              批量评估
            </button>
          </div>
        </div>
      )}
      
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <IndeterminateCheckbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onChange={(e) => handleSelectAllRows(e.target.checked)}
                    />
                  </th>
                  {tableHeaders.map(header => (
                    <th 
                      key={header.key}
                      scope="col" 
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${header.className || ''} ${header.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                      onClick={() => header.sortable && handleSort(header.key)}
                    >
                      <div className="flex items-center">
                        {header.label}
                        {header.sortable && currentSort.field === header.key && (
                          currentSort.order === 'asc' 
                            ? <ChevronUpIcon className="h-4 w-4 ml-1 text-gray-600" />
                            : <ChevronDownIcon className="h-4 w-4 ml-1 text-gray-600" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {domains.length === 0 ? (
                  <tr>
                    <td colSpan={tableHeaders.length + 1} className="px-6 py-12 text-center text-sm text-gray-500">
                      没有找到匹配的域名记录。
                    </td>
                  </tr>
                ) : (
                  domains.map((domain) => (
                    <tr 
                      key={domain._id} 
                      className={`hover:bg-gray-50 ${selectedIds.includes(domain._id) ? 'bg-indigo-50' : ''} ${
                        dayjs(domain.expiryDate).diff(dayjs(), 'day') < 0 ? 'bg-red-50' : 
                        (dayjs(domain.expiryDate).diff(dayjs(), 'day') <= 30 ? 'bg-red-50' : '') // 高亮30天内到期，已过期也用红色背景
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <IndeterminateCheckbox
                          checked={selectedIds.includes(domain._id)}
                          onChange={(e) => handleSelectRow(domain._id, e.target.checked)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-xs" title={domain.domainName}>
                        {domain.domainName}
                        {domain.businessUsage && <div className="text-xs text-gray-500 truncate" title={domain.businessUsage}>{domain.businessUsage}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {domain.domainType || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs" title={domain.holder}>
                        {domain.holder || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <ExpiryDateCell value={domain.expiryDate} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {domain.renewalPriceRaw || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs" title={domain.resolverProvider}>
                        {domain.resolverProvider || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={domain.icpStatus && domain.icpStatus !== '无' ? 'text-green-600 font-medium' : ''}>
                          {domain.icpStatus || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <RenewalSuggestionCell value={domain.renewalSuggestion} />
                        {domain.renewalSuggestionReason && <div className="text-xs text-gray-500 mt-1 truncate max-w-xs" title={domain.renewalSuggestionReason}>{domain.renewalSuggestionReason}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center justify-center space-x-3">
                          <button onClick={() => onEdit(domain)} className="text-indigo-600 hover:text-indigo-900" title="编辑">
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button onClick={() => onEvaluate(domain._id)} className="text-green-600 hover:text-green-900" title="重新评估续费建议">
                            <ArrowPathIcon className="h-5 w-5" />
                          </button>
                          <button onClick={() => onDelete(domain._id)} className="text-red-600 hover:text-red-900" title="删除">
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
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
          <div className="flex-1 flex justify-between sm:hidden">
            <button onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page === 1} className="pagination-button">上一页</button>
            <button onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} className="pagination-button">下一页</button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
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
