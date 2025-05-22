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
