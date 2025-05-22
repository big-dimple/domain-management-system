#!/bin/bash

# 域名管理系统 - 前端页面组件脚本
# 此脚本负责创建各个功能页面的React组件。

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
print_blue "    域名管理系统 - 前端页面组件脚本"
print_blue "========================================"
print_yellow "此脚本将创建以下页面组件:"
echo "1. DomainListPage.jsx - 域名列表页面"
echo "2. HistoryPage.jsx - 历史记录页面"
echo "3. RenewalStandardsPage.jsx - 续费标准页面"
echo "4. SystemPage.jsx - 系统状态页面"
echo "5. DashboardPage.jsx - 仪表盘页面" # 新增

# 创建pages目录 (如果不存在)
mkdir -p "$PROJECT_DIR/frontend/src/pages"

# 创建DomainListPage.jsx
print_green "创建域名列表页面 (./frontend/src/pages/DomainListPage.jsx)..."
cat > "$PROJECT_DIR/frontend/src/pages/DomainListPage.jsx" << 'EOF'
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react'; // 使用Headless UI的Dialog和Transition
import { PlusIcon } from '@heroicons/react/20/solid'; // 添加图标
import useDomainStore from '../stores/domainStore';
import DomainTable from '../components/DomainTable';
import DomainFilter from '../components/DomainFilter';
import DomainForm from '../components/DomainForm';
import DomainImportExport from '../components/DomainImportExport';

export default function DomainListPage() {
  const {
    domains,
    loading,
    error,
    pagination,
    filters, // 当前筛选条件
    sort,    // 当前排序条件
    fetchDomains,
    setPage,
    setSort, 
    setFilters,
    resetFilters,
    createDomain,
    updateDomain,
    deleteDomain,
    evaluateRenewal,
    batchOperation,
    importCsv,
    exportCsv
  } = useDomainStore();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentDomain, setCurrentDomain] = useState(null); // 用于编辑的域名数据
  const [domainToDelete, setDomainToDelete] = useState(null); // 用于删除确认的域名ID

  // 使用 useCallback 包装 fetchDomains，以避免在 useEffect 依赖数组中频繁变化
  const stableFetchDomains = useCallback(() => {
    fetchDomains();
  }, [fetchDomains]); // fetchDomains 本身是Zustand store中的稳定引用

  useEffect(() => {
    stableFetchDomains(); // 页面加载时获取数据
  }, [stableFetchDomains]); // 依赖稳定版的获取函数
  
  const handleAddDomain = () => {
    setCurrentDomain(null); // 清空当前编辑的域名，表示是新增
    setIsAddModalOpen(true);
  };
  
  const handleEditDomain = (domain) => {
    setCurrentDomain(domain);
    setIsEditModalOpen(true);
  };
  
  const handleDeleteDomain = (id) => {
    setDomainToDelete(id);
    setIsDeleteModalOpen(true);
  };
  
  const handleEvaluateRenewal = async (id) => {
    // loading 状态由 store 控制
    const result = await evaluateRenewal(id);
    if (!result.success) {
      // toast.error('更新续费建议失败'); // store中API拦截器已处理
    }
  };
  
  const handleBatchOperation = async (operation, ids, data) => {
    const result = await batchOperation(operation, ids, data);
    if (!result.success) {
      // toast.error(`批量操作失败: ${result.error}`);
    }
  };
  
  const handleFormSubmit = async (formData) => {
    let result;
    if (currentDomain) { // 编辑模式
      result = await updateDomain(currentDomain._id, formData);
      if (result.success) setIsEditModalOpen(false);
    } else { // 新增模式
      result = await createDomain(formData);
      if (result.success) setIsAddModalOpen(false);
    }
    // 成功/失败的toast已在store的action中处理
  };
  
  const confirmDelete = async () => {
    const result = await deleteDomain(domainToDelete);
    if (result.success) {
      setIsDeleteModalOpen(false);
    }
  };
  
  return (
    <div>
      {/* 页面头部和添加按钮 */}
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
          域名列表
        </h1>
        <div className="mt-3 sm:mt-0 sm:ml-4">
          <button
            type="button"
            onClick={handleAddDomain}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            添加域名
          </button>
        </div>
      </div>
      
      {/* 导入导出区域 */}
      <DomainImportExport onImport={importCsv} onExport={exportCsv} />
      
      {/* 筛选区域 */}
      <DomainFilter
        filters={filters}
        onFilterChange={setFilters} // 直接传递 store 的 action
        onResetFilters={resetFilters} // 直接传递 store 的 action
      />
      
      {/* 域名表格 */}
      {loading && domains.length === 0 ? ( // 初始加载时显示loading
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <p className="ml-3 text-gray-700">正在加载域名数据...</p>
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
              <p className="text-sm text-red-700">加载域名数据失败: {error}</p>
            </div>
          </div>
        </div>
      ) : (
        <DomainTable
          domains={domains}
          pagination={pagination}
          currentSort={sort} // 传递当前排序状态给表格以显示正确的图标
          onPageChange={setPage}
          onSort={setSort} // 传递 store 的 setSort action
          onEdit={handleEditDomain}
          onDelete={handleDeleteDomain}
          onEvaluate={handleEvaluateRenewal}
          onBatchOperation={handleBatchOperation}
        />
      )}
      
      {/* 添加/编辑域名弹窗 (共用一个表单组件，通过 currentDomain 判断模式) */}
      <Transition appear show={isAddModalOpen || isEditModalOpen} as="div">
        <Dialog as="div" className="relative z-10" onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}>
          <Transition.Child
            as="div"
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as="div"
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {currentDomain ? '编辑域名' : '添加新域名'}
                  </Dialog.Title>
                  <div className="mt-4 max-h-[70vh] overflow-y-auto pr-2"> {/* 限制高度并允许滚动 */}
                    <DomainForm
                      domain={currentDomain}
                      onSubmit={handleFormSubmit}
                      onCancel={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                    />
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      {/* 删除确认弹窗 */}
      <Transition appear show={isDeleteModalOpen} as="div">
        <Dialog as="div" className="relative z-10" onClose={() => setIsDeleteModalOpen(false)}>
          <Transition.Child as="div" enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as="div" enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    确认删除域名
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      您确定要删除这个域名吗？此操作执行后将无法撤销。
                    </p>
                  </div>
                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                      onClick={() => setIsDeleteModalOpen(false)}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      onClick={confirmDelete}
                    >
                      确认删除
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
EOF

# 创建HistoryPage.jsx
print_green "创建历史记录页面 (./frontend/src/pages/HistoryPage.jsx)..."
cat > "$PROJECT_DIR/frontend/src/pages/HistoryPage.jsx" << 'EOF'
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
EOF

# 创建RenewalStandardsPage.jsx
print_green "创建续费标准页面 (./frontend/src/pages/RenewalStandardsPage.jsx)..."
cat > "$PROJECT_DIR/frontend/src/pages/RenewalStandardsPage.jsx" << 'EOF'
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
EOF

# 创建SystemPage.jsx
print_green "创建系统状态页面 (./frontend/src/pages/SystemPage.jsx)..."
cat > "$PROJECT_DIR/frontend/src/pages/SystemPage.jsx" << 'EOF'
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
EOF

# Create DashboardPage.jsx
print_green "创建仪表盘页面 (./frontend/src/pages/DashboardPage.jsx)..."
cat > "$PROJECT_DIR/frontend/src/pages/DashboardPage.jsx" << 'EOF'
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
EOF

print_green "前端页面组件创建完成！"
print_blue "========================================"
print_blue "         前端页面组件摘要"
print_blue "========================================"
echo "已创建: ./frontend/src/pages/DomainListPage.jsx"
echo "已创建: ./frontend/src/pages/HistoryPage.jsx"
echo "已创建: ./frontend/src/pages/RenewalStandardsPage.jsx"
echo "已创建: ./frontend/src/pages/SystemPage.jsx"
echo "已创建: ./frontend/src/pages/DashboardPage.jsx"
print_yellow "继续执行前端交互式组件脚本..."

exit 0
