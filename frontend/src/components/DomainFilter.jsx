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
