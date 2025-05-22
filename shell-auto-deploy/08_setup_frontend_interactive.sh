#!/bin/bash

# 域名管理系统 - 前端交互式组件脚本
# 此脚本负责创建表格、表单、过滤器等复杂交互组件。

# 彩色输出函数
print_green() {
    echo -e "\e[32m$1\e[0m" # 绿色输出
}

print_yellow() {
    echo -e "\e[33m$1\e[0m" # 黄色输出
}

print_red() {
    echo -e "\e[31m$1\e[0m" # 红色输出
}

print_blue() {
    echo -e "\e[34m$1\e[0m" # 蓝色输出
}

# 读取配置
# PROJECT_DIR 将从此文件加载
if [ -f /tmp/domain-management-system/config ]; then
    source /tmp/domain-management-system/config
else
    print_red "错误：找不到配置文件 /tmp/domain-management-system/config。"
    print_red "请确保已先运行初始化脚本 (02_initialize_project.sh)。"
    exit 1
fi

# 检查 PROJECT_DIR 是否已设置
if [ -z "$PROJECT_DIR" ]; then
    print_red "错误：项目目录 (PROJECT_DIR) 未在配置文件中设置。"
    exit 1
fi

# 显示脚本信息
print_blue "========================================"
print_blue "   域名管理系统 - 前端交互式组件脚本"
print_blue "========================================"
print_yellow "此脚本将创建以下交互式组件:"
echo "1. DomainTable.jsx - 域名表格组件"
echo "2. DomainFilter.jsx - 域名过滤器组件"
echo "3. DomainForm.jsx - 域名表单（增/改）组件"
echo "4. DomainImportExport.jsx - 域名导入/导出组件"
echo "5. HistoryTable.jsx - 历史记录表格组件"

# 创建DomainTable.jsx
print_green "创建域名表格组件 (./frontend/src/components/DomainTable.jsx)..."
cat > "$PROJECT_DIR/frontend/src/components/DomainTable.jsx" << 'EOF'
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
EOF

# 创建DomainFilter.jsx
print_green "创建域名过滤器组件 (./frontend/src/components/DomainFilter.jsx)..."
cat > "$PROJECT_DIR/frontend/src/components/DomainFilter.jsx" << 'EOF'
import { useState, useEffect } from 'react';
import { 
  FunnelIcon, 
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// 选项配置
const domainTypeOptions = [ { value: '', label: '全部类型' }, { value: 'gTLD', label: 'gTLD' }, { value: 'ccTLD', label: 'ccTLD' }, { value: 'New gTLD', label: 'New gTLD' }];
const businessUsageOptions = [ { value: '', label: '全部使用情况' }, { value: '未使用', label: '未使用' }, { value: '已使用', label: '已使用' }, /* 可添加更多 */ ];
const icpStatusOptions = [ { value: '', label: '全部ICP状态' }, { value: '无', label: '无' }, { value: '有', label: '有' }, /* 可添加具体备案号前缀等 */ ];
const renewalSuggestionOptions = [ { value: '', label: '全部续费建议' }, { value: '建议续费', label: '建议续费' }, { value: '可不续费', label: '可不续费' }, { value: '请示领导', label: '请示领导' }, { value: '待评估', label: '待评估' }, { value: '不续费', label: '不续费' }];
const expiringDaysOptions = [ { value: '', label: '全部到期时间' }, { value: '30', label: '30天内到期' }, { value: '60', label: '60天内到期' }, { value: '90', label: '90天内到期' }];

export default function DomainFilter({ filters: globalFilters, onFilterChange, onResetFilters }) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // 本地状态，用于控制表单输入，与全局filters同步
  const [localSearch, setLocalSearch] = useState(globalFilters.search || '');
  const [localDomainType, setLocalDomainType] = useState(globalFilters.domainType || '');
  const [localBusinessUsage, setLocalBusinessUsage] = useState(globalFilters.businessUsage || '');
  const [localIcpStatus, setLocalIcpStatus] = useState(globalFilters.icpStatus || '');
  const [localRenewalSuggestion, setLocalRenewalSuggestion] = useState(globalFilters.renewalSuggestion || '');
  const [localExpiringDays, setLocalExpiringDays] = useState(globalFilters.expiringDays || '');

  // 当全局筛选条件变化时（例如，通过URL或store外部更改），更新本地状态
  useEffect(() => {
    setLocalSearch(globalFilters.search || '');
    setLocalDomainType(globalFilters.domainType || '');
    setLocalBusinessUsage(globalFilters.businessUsage || '');
    setLocalIcpStatus(globalFilters.icpStatus || '');
    setLocalRenewalSuggestion(globalFilters.renewalSuggestion || '');
    setLocalExpiringDays(globalFilters.expiringDays || '');
  }, [globalFilters]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onFilterChange({ 
      search: localSearch,
      domainType: localDomainType,
      businessUsage: localBusinessUsage,
      icpStatus: localIcpStatus,
      renewalSuggestion: localRenewalSuggestion,
      expiringDays: localExpiringDays,
    });
  };

  const handleLocalReset = () => {
    setLocalSearch('');
    setLocalDomainType('');
    setLocalBusinessUsage('');
    setLocalIcpStatus('');
    setLocalRenewalSuggestion('');
    setLocalExpiringDays('');
    onResetFilters(); // 调用全局重置
  };
  
  const hasActiveFilters = () => {
    // 检查是否有任何筛选条件被激活 (不包括搜索框的即时输入，而是已应用的筛选)
    return Object.values(globalFilters).some(value => value && value !== '');
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      {/* 主搜索行 */}
      <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row sm:items-end sm:space-x-3">
        <div className="flex-grow mb-3 sm:mb-0">
          <label htmlFor="search" className="sr-only">搜索域名</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              name="search"
              id="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="搜索域名、持有者..."
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <MagnifyingGlassIcon className="-ml-1 mr-2 h-5 w-5" />
            应用搜索
          </button>
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FunnelIcon className={`-ml-1 mr-2 h-5 w-5 ${showAdvancedFilters ? 'text-indigo-600' : 'text-gray-500'}`} />
            高级筛选
          </button>
          {hasActiveFilters() && (
            <button
              type="button"
              onClick={handleLocalReset}
              title="清除所有筛选条件"
              className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </div>
      </form>
      
      {/* 高级筛选区域 */}
      {showAdvancedFilters && (
        <form onSubmit={handleFormSubmit} className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[
              { id: 'domainType', label: '域名类型', value: localDomainType, setter: setLocalDomainType, options: domainTypeOptions },
              { id: 'businessUsage', label: '业务使用', value: localBusinessUsage, setter: setLocalBusinessUsage, options: businessUsageOptions },
              { id: 'icpStatus', label: 'ICP状态', value: localIcpStatus, setter: setLocalIcpStatus, options: icpStatusOptions },
              { id: 'renewalSuggestion', label: '续费建议', value: localRenewalSuggestion, setter: setLocalRenewalSuggestion, options: renewalSuggestionOptions },
              { id: 'expiringDays', label: '到期时间', value: localExpiringDays, setter: setLocalExpiringDays, options: expiringDaysOptions },
            ].map(filter => (
              <div key={filter.id}>
                <label htmlFor={filter.id} className="block text-sm font-medium text-gray-700">
                  {filter.label}
                </label>
                <select
                  id={filter.id}
                  name={filter.id}
                  value={filter.value}
                  onChange={(e) => filter.setter(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
           <div className="mt-6 flex justify-end space-x-3">
             <button
              type="button"
              onClick={handleLocalReset}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              重置筛选
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              应用高级筛选
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
EOF

# 创建DomainForm.jsx
print_green "创建域名表单组件 (./frontend/src/components/DomainForm.jsx)..."
cat > "$PROJECT_DIR/frontend/src/components/DomainForm.jsx" << 'EOF'
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form'; // 引入 Controller 用于受控组件
import dayjs from 'dayjs';

const domainTypeOptions = [ { value: 'gTLD', label: 'gTLD' }, { value: 'ccTLD', label: 'ccTLD' }, { value: 'New gTLD', label: 'New gTLD' }];

export default function DomainForm({ domain, onSubmit, onCancel }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const isEditMode = Boolean(domain); // 判断是编辑模式还是新增模式

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, control, watch } = useForm({
    defaultValues: { // 表单默认值
      domainName: '',
      domainType: 'gTLD',
      renewalPriceRaw: '',
      expiryDate: '', // 将以 YYYY-MM-DD 格式存储
      holder: '',
      resolverAccount: '',
      resolverProvider: '',
      businessUsage: '',
      icpStatus: '',
      notes: '',
      isMarkedForNoRenewal: false,
      hasSpecialValue: false
    }
  });
  
  // 当 domain prop 变化时 (例如打开编辑弹窗)，用 domain 数据重置表单
  useEffect(() => {
    if (isEditMode && domain) {
      const formData = {
        ...domain,
        // 将日期转换为 YYYY-MM-DD 格式以适配 date input
        expiryDate: domain.expiryDate ? dayjs(domain.expiryDate).format('YYYY-MM-DD') : '',
      };
      reset(formData); // 使用 react-hook-form 的 reset 方法填充表单
    } else {
      // 新增模式或domain为空时，重置为默认值
      reset({
        domainName: '', domainType: 'gTLD', renewalPriceRaw: '', expiryDate: '',
        holder: '', resolverAccount: '', resolverProvider: '', businessUsage: '',
        icpStatus: '', notes: '', isMarkedForNoRenewal: false, hasSpecialValue: false
      });
    }
  }, [domain, isEditMode, reset]);
  
  const handleFormSubmit = (data) => {
    // 准备提交给后端的数据
    const submissionData = {
      ...data,
      // 将日期字符串转换回 Date 对象或 null
      expiryDate: data.expiryDate ? dayjs(data.expiryDate).toDate() : null,
      // 确保布尔值正确传递
      isMarkedForNoRenewal: Boolean(data.isMarkedForNoRenewal),
      hasSpecialValue: Boolean(data.hasSpecialValue),
    };
    onSubmit(submissionData); // 调用父组件传递的 onSubmit 函数
  };
  
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        {/* 域名 */}
        <div className="sm:col-span-3">
          <label htmlFor="domainName" className="block text-sm font-medium leading-6 text-gray-900">域名 *</label>
          <div className="mt-2">
            <input
              type="text"
              id="domainName"
              {...register('domainName', { 
                required: '域名不能为空',
                pattern: {
                  value: /^([a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
                  message: '请输入有效的域名格式 (例如: example.com)'
                }
              })}
              className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${errors.domainName ? 'ring-red-500' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
              placeholder="example.com"
            />
            {errors.domainName && <p className="mt-2 text-sm text-red-600">{errors.domainName.message}</p>}
          </div>
        </div>
        
        {/* 域名类型 */}
        <div className="sm:col-span-3">
          <label htmlFor="domainType" className="block text-sm font-medium leading-6 text-gray-900">域名类型 *</label>
          <div className="mt-2">
            <select
              id="domainType"
              {...register('domainType', { required: '请选择域名类型' })}
              className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${errors.domainType ? 'ring-red-500' : 'ring-gray-300'} focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
            >
              {domainTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {errors.domainType && <p className="mt-2 text-sm text-red-600">{errors.domainType.message}</p>}
          </div>
        </div>
        
        {/* 年续费价 */}
        <div className="sm:col-span-3">
          <label htmlFor="renewalPriceRaw" className="block text-sm font-medium leading-6 text-gray-900">年续费价</label>
          <div className="mt-2">
            <input type="text" id="renewalPriceRaw" {...register('renewalPriceRaw')} placeholder="例如: 39元, 11 USD"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
          </div>
        </div>
        
        {/* 到期日期 */}
        <div className="sm:col-span-3">
          <label htmlFor="expiryDate" className="block text-sm font-medium leading-6 text-gray-900">到期日期 *</label>
          <div className="mt-2">
            <input type="date" id="expiryDate" {...register('expiryDate', { required: '请选择到期日期' })}
              className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${errors.expiryDate ? 'ring-red-500' : 'ring-gray-300'} focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`} />
            {errors.expiryDate && <p className="mt-2 text-sm text-red-600">{errors.expiryDate.message}</p>}
          </div>
        </div>
        
        {/* 持有者 */}
        <div className="sm:col-span-3">
          <label htmlFor="holder" className="block text-sm font-medium leading-6 text-gray-900">持有者 (中文)</label>
          <div className="mt-2">
            <input type="text" id="holder" {...register('holder')}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
          </div>
        </div>
        
        {/* 业务使用情况 */}
        <div className="sm:col-span-3">
          <label htmlFor="businessUsage" className="block text-sm font-medium leading-6 text-gray-900">业务使用情况</label>
          <div className="mt-2">
            <input type="text" id="businessUsage" {...register('businessUsage')} placeholder="例如: 公司官网, 未使用"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
          </div>
        </div>
        
        {/* 解析管理账号 */}
        <div className="sm:col-span-3">
          <label htmlFor="resolverAccount" className="block text-sm font-medium leading-6 text-gray-900">解析管理账号</label>
          <div className="mt-2">
            <input type="text" id="resolverAccount" {...register('resolverAccount')}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
          </div>
        </div>
        
        {/* 解析管理方 */}
        <div className="sm:col-span-3">
          <label htmlFor="resolverProvider" className="block text-sm font-medium leading-6 text-gray-900">解析管理方</label>
          <div className="mt-2">
            <input type="text" id="resolverProvider" {...register('resolverProvider')} placeholder="例如: Cloudflare, DNSPod"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
          </div>
        </div>
        
        {/* ICP证 */}
        <div className="sm:col-span-3">
          <label htmlFor="icpStatus" className="block text-sm font-medium leading-6 text-gray-900">ICP证</label>
          <div className="mt-2">
            <input type="text" id="icpStatus" {...register('icpStatus')} placeholder="例如: 无, 京ICP备XXXXXXXX号"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
          </div>
        </div>
        
        {/* 高级选项切换按钮 */}
        <div className="sm:col-span-6">
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm font-semibold leading-6 text-indigo-600 hover:text-indigo-500">
            {showAdvanced ? '隐藏高级选项' : '显示高级选项'}
          </button>
        </div>
        
        {/* 高级选项区域 */}
        {showAdvanced && (
          <>
            <div className="sm:col-span-6">
              <label htmlFor="notes" className="block text-sm font-medium leading-6 text-gray-900">备注信息</label>
              <div className="mt-2">
                <textarea id="notes" rows={3} {...register('notes')}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
              </div>
            </div>
            
            <div className="sm:col-span-3 relative flex items-start">
              <div className="flex h-6 items-center">
                <input id="isMarkedForNoRenewal" type="checkbox" {...register('isMarkedForNoRenewal')}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
              </div>
              <div className="ml-3 text-sm leading-6">
                <label htmlFor="isMarkedForNoRenewal" className="font-medium text-gray-900">标记为不续费</label>
                <p className="text-xs text-gray-500">选中后，该域名将总被建议为"不续费"。</p>
              </div>
            </div>
            
            <div className="sm:col-span-3 relative flex items-start">
              <div className="flex h-6 items-center">
                <input id="hasSpecialValue" type="checkbox" {...register('hasSpecialValue')}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
              </div>
              <div className="ml-3 text-sm leading-6">
                <label htmlFor="hasSpecialValue" className="font-medium text-gray-900">具有特殊价值</label>
                <p className="text-xs text-gray-500">选中后，该域名将优先被建议续费。</p>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* 表单操作按钮 */}
      <div className="mt-8 flex justify-end space-x-3 border-t border-gray-200 pt-5">
        <button type="button" onClick={onCancel} disabled={isSubmitting}
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50">
          取消
        </button>
        <button type="submit" disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50">
          {isSubmitting ? '保存中...' : (isEditMode ? '保存更改' : '创建域名')}
        </button>
      </div>
    </form>
  );
}
EOF

# 创建DomainImportExport.jsx
print_green "创建域名导入/导出组件 (./frontend/src/components/DomainImportExport.jsx)..."
cat > "$PROJECT_DIR/frontend/src/components/DomainImportExport.jsx" << 'EOF'
import { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { 
  ArrowUpTrayIcon, 
  ArrowDownTrayIcon,
  DocumentArrowUpIcon // 替换了 DocumentCheckIcon
} from '@heroicons/react/24/outline';

export default function DomainImportExport({ onImport, onExport }) {
  const [selectedFile, setSelectedFile] = useState(null); // 用于存储选择的文件对象
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null); // 存储导入结果
  const fileInputRef = useRef(null); // 用于重置文件输入框

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setImportResults(null); // 清除上一次的导入结果
      } else {
        toast.error('文件格式无效，请选择CSV文件。');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = ''; // 重置文件输入
      }
    } else {
      setSelectedFile(null);
    }
  };
  
  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('请先选择要导入的CSV文件。');
      return;
    }
    
    setIsImporting(true);
    setImportResults(null); 
    
    try {
      const result = await onImport(selectedFile); // onImport 是从 props 传递的 store action
      
      if (result.success) {
        setImportResults(result.data); // result.data 应该包含 { total, success, updated, failed, errors }
        toast.success(`导入完成: ${result.data.success || 0}条新增, ${result.data.updated || 0}条更新, ${result.data.failed || 0}条失败。`);
      } else {
        // API 拦截器可能已经弹了 toast，这里可以显示更具体的错误或汇总
        const errorMsg = result.error || '导入过程中发生未知错误。';
        setImportResults(result.data || { total:0, success:0, updated:0, failed: (result.data?.total || 1), errors: [{ domainName: '文件级别错误', error: errorMsg }] });
        toast.error(`导入失败: ${errorMsg}`);
      }
    } catch (error) {
      const errorMsg = error.message || '客户端导入请求失败。';
      setImportResults({ errors: [{ domainName: '请求错误', error: errorMsg }] });
      toast.error(`导入请求失败: ${errorMsg}`);
    } finally {
      setIsImporting(false);
      // 成功或失败后不清空 selectedFile，用户可能想看文件名
      // 如果需要每次导入后清空，可以在这里加:
      // setSelectedFile(null);
      // if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  const handleExport = async () => {
    // loading 状态由 domainStore 内部控制 (如果 onExport 是异步 action)
    try {
      await onExport(); // onExport 是从 props 传递的 store action
      // toast 提示已在 domainStore 的 exportCsv action 中处理
    } catch (error) {
      // toast.error('导出CSV文件失败。'); // 通常也在 store action 中处理
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">数据导入/导出</h3>
          <p className="mt-1 text-sm text-gray-500">
            通过CSV文件批量导入域名，或导出当前所有域名数据。
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4 sm:flex-shrink-0 flex flex-col sm:flex-row sm:items-center gap-2">
          {/* 隐藏的原生文件输入框 */}
          <input
            type="file"
            id="csv-file-input"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="sr-only"
          />
          {/* 自定义文件选择按钮 */}
          <button
            type="button"
            onClick={handleTriggerFileInput}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <ArrowUpTrayIcon className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-500" aria-hidden="true" />
            选择CSV文件
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            <DocumentArrowUpIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            {isImporting ? '正在导入...' : '开始导入'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            <ArrowDownTrayIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            导出为CSV
          </button>
        </div>
      </div>
      
      {selectedFile && (
        <div className="mt-3 text-sm text-gray-700">
          已选择文件: <span className="font-medium text-indigo-600">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(2)} KB)
        </div>
      )}
      
      {importResults && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h4 className="text-md font-semibold text-gray-800 mb-2">导入结果:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>总处理行数: <span className="font-bold">{importResults.total || 0}</span></div>
            <div className="text-green-600">成功新增: <span className="font-bold">{importResults.success || 0}</span></div>
            <div className="text-blue-600">成功更新: <span className="font-bold">{importResults.updated || 0}</span></div>
            <div className="text-red-600">导入失败: <span className="font-bold">{importResults.failed || 0}</span></div>
          </div>
          
          {importResults.errors && importResults.errors.length > 0 && (
            <div className="mt-3">
              <h5 className="text-sm font-semibold text-red-700">错误详情:</h5>
              <ul className="mt-1 list-disc list-inside text-xs text-red-600 max-h-32 overflow-y-auto bg-red-50 p-2 rounded">
                {importResults.errors.map((err, index) => (
                  <li key={index}>
                    {err.domainName ? `域名 "${err.domainName}": ` : `行 ${err.row || index + 1}: `} {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
EOF

# 创建HistoryTable.jsx - 增强版
print_green "创建历史记录表格组件 (./frontend/src/components/HistoryTable.jsx)..."
cat > "$PROJECT_DIR/frontend/src/components/HistoryTable.jsx" << 'EOF'
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
EOF

# 创建用于添加分页样式的CSS补充文件
print_green "追加分页样式到 ./frontend/src/index.css ..."
cat >> "$PROJECT_DIR/frontend/src/index.css" << 'EOF'

/* 分页按钮样式 */
.pagination-button {
  @apply relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500;
}

.pagination-button:disabled {
  @apply opacity-50 cursor-not-allowed hover:bg-white;
}

.pagination-button-active {
  @apply z-10 bg-indigo-50 border-indigo-500 text-indigo-600;
}
EOF

print_green "前端交互式组件创建完成！"
print_blue "========================================"
print_blue "         前端交互式组件摘要"
print_blue "========================================"
echo "已创建: ./frontend/src/components/DomainTable.jsx"
echo "已创建: ./frontend/src/components/DomainFilter.jsx"
echo "已创建: ./frontend/src/components/DomainForm.jsx"
echo "已创建: ./frontend/src/components/DomainImportExport.jsx"
echo "已创建: ./frontend/src/components/HistoryTable.jsx"
echo "已追加: 分页样式到 ./frontend/src/index.css"
print_yellow "继续执行前端可视化图表组件脚本..."

exit 0
