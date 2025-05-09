import React, { useState, useEffect, useMemo } from 'react';
import { useTable, useSortBy, useFilters, usePagination, useGlobalFilter } from 'react-table';
import { format, isAfter, addMonths, parseISO } from 'date-fns';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

// 定义表格列
const columns = [
  {
    Header: '域名',
    accessor: 'name',
    filter: 'fuzzyText',
  },
  {
    Header: '类型',
    accessor: 'type',
    Filter: SelectColumnFilter,
  },
  {
    Header: '年续费价',
    accessor: 'renewalFee',
  },
  {
    Header: '到期日期',
    accessor: 'expiryDate',
    Cell: ({ value }) => format(new Date(value), 'yyyy/MM/dd'),
    sortType: 'datetime',
  },
  {
    Header: '持有者',
    accessor: 'holder',
    Filter: SelectColumnFilter,
  },
  {
    Header: '解析管理账号',
    accessor: 'dnsAccount',
  },
  {
    Header: '解析管理方',
    accessor: 'dnsManager',
    Filter: SelectColumnFilter,
  },
  {
    Header: '业务使用情况',
    accessor: 'usage',
  },
  {
    Header: 'ICP备案',
    accessor: 'icpRegistration',
    Cell: ({ value }) => (value ? '是' : '否'),
    Filter: SelectColumnFilter,
    filter: 'equals',
  },
  {
    Header: 'ICP证',
    accessor: 'icpLicense',
    Cell: ({ value }) => (value && value !== '无' ? value : '无'),
  },
  {
    Header: '操作',
    accessor: '_id',
    disableFilters: true,
    disableSortBy: true,
    Cell: ({ row, onEdit, onDelete }) => (
      <div className="flex space-x-2">
        <button
          onClick={() => onEdit(row.original)}
          className="p-1 text-blue-600 hover:text-blue-800"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(row.original._id)}
          className="p-1 text-red-600 hover:text-red-800"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    ),
  },
];

// 筛选器组件
function SelectColumnFilter({
  column: { filterValue, setFilter, preFilteredRows, id },
}) {
  const options = useMemo(() => {
    const optionsSet = new Set();
    preFilteredRows.forEach(row => {
      const value = row.values[id];
      if (value !== undefined && value !== null) {
        if (typeof value === 'boolean') {
          optionsSet.add(value ? '是' : '否');
        } else {
          optionsSet.add(value);
        }
      }
    });
    return [...optionsSet.values()];
  }, [id, preFilteredRows]);

  return (
    <select
      className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50 text-sm"
      value={filterValue}
      onChange={e => {
        setFilter(e.target.value || undefined);
      }}
    >
      <option value="">全部</option>
      {options.map((option, i) => (
        <option key={i} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

// 全局搜索组件
function GlobalFilter({ globalFilter, setGlobalFilter }) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
      </div>
      <input
        value={globalFilter || ''}
        onChange={e => setGlobalFilter(e.target.value || undefined)}
        placeholder="搜索所有域名..."
        className="pl-10 p-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );
}

// 域名表格组件
const DomainTable = ({ domains, onEdit, onDelete, onRefresh }) => {
  // 使用React Table
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize, globalFilter },
    setGlobalFilter,
  } = useTable(
    {
      columns,
      data: domains,
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  return (
    <div className="mt-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-2 md:space-y-0">
        <GlobalFilter globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} />
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
          >
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            刷新
          </button>
        </div>
      </div>

      {/* 到期警告 */}
      {domains.some(domain => {
        const expiryDate = new Date(domain.expiryDate);
        const threeMonthsFromNow = addMonths(new Date(), 3);
        return isAfter(threeMonthsFromNow, expiryDate);
      }) && (
        <div className="flex items-center p-4 mb-4 text-amber-800 border-l-4 border-amber-500 bg-amber-50 rounded-md">
          <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
          <span>有域名将在3个月内到期，请注意及时续费。</span>
        </div>
      )}

      {/* 表格 */}
      <div className="overflow-x-auto rounded-lg shadow">
        <table
          {...getTableProps()}
          className="min-w-full divide-y divide-gray-200 border-collapse"
        >
          <thead className="bg-gray-50">
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex items-center">
                      {column.render('Header')}
                      <span>
                        {column.isSorted ? (
                          column.isSortedDesc ? (
                            <ChevronDownIcon className="w-4 h-4 ml-1" />
                          ) : (
                            <ChevronUpIcon className="w-4 h-4 ml-1" />
                          )
                        ) : (
                          ''
                        )}
                      </span>
                    </div>
                    <div className="mt-1">
                      {!column.disableFilters ? column.render('Filter') : null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody
            {...getTableBodyProps()}
            className="bg-white divide-y divide-gray-200"
          >
            {page.map(row => {
              prepareRow(row);
              const expiryDate = new Date(row.original.expiryDate);
              const threeMonthsFromNow = addMonths(new Date(), 3);
              const isExpiringSoon = isAfter(threeMonthsFromNow, expiryDate);

              return (
                <tr
                  {...row.getRowProps()}
                  className={`hover:bg-gray-50 ${
                    isExpiringSoon ? 'bg-amber-50' : ''
                  }`}
                >
                  {row.cells.map(cell => {
                    return (
                      <td
                        {...cell.getCellProps()}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                      >
                        {cell.column.id === '_id'
                          ? cell.render('Cell', { onEdit, onDelete })
                          : cell.render('Cell')}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分页控件 */}
      <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 mt-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            每页显示
          </span>
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
            }}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50 text-sm"
          >
            {[10, 20, 30, 50].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-700">
            第 {pageIndex + 1} 页，共 {pageOptions.length} 页
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            className="px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => gotoPage(0)}
            disabled={!canPreviousPage}
          >
            首页
          </button>
          <button
            className="px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => previousPage()}
            disabled={!canPreviousPage}
          >
            上一页
          </button>
          <button
            className="px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => nextPage()}
            disabled={!canNextPage}
          >
            下一页
          </button>
          <button
            className="px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => gotoPage(pageCount - 1)}
            disabled={!canNextPage}
          >
            末页
          </button>
        </div>
      </div>
    </div>
  );
};

// 域名表单组件
const DomainForm = ({ domain, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    renewalFee: '',
    expiryDate: '',
    holder: '',
    dnsAccount: '',
    dnsManager: '',
    usage: '',
    icpRegistration: false,
    icpLicense: '',
    notes: '',
    ...domain,
  });

  useEffect(() => {
    if (domain) {
      setFormData({
        ...domain,
        expiryDate: domain.expiryDate 
          ? format(new Date(domain.expiryDate), 'yyyy-MM-dd')
          : '',
      });
    }
  }, [domain]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formattedData = {
      ...formData,
      expiryDate: formData.expiryDate ? parseISO(formData.expiryDate) : null,
    };
    onSubmit(formattedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">域名</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">域名类型</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
          >
            <option value="">请选择类型</option>
            <option value="gTLD">gTLD</option>
            <option value="ccTLD">ccTLD</option>
            <option value="New gTLD">New gTLD</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">年续费价</label>
          <input
            type="text"
            name="renewalFee"
            value={formData.renewalFee}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">到期日期</label>
          <input
            type="date"
            name="expiryDate"
            value={formData.expiryDate}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">持有者</label>
          <input
            type="text"
            name="holder"
            value={formData.holder}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">解析管理账号</label>
          <input
            type="text"
            name="dnsAccount"
            value={formData.dnsAccount}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">解析管理方</label>
          <input
            type="text"
            name="dnsManager"
            value={formData.dnsManager}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">业务使用情况</label>
          <input
            type="text"
            name="usage"
            value={formData.usage}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            name="icpRegistration"
            checked={formData.icpRegistration}
            onChange={handleChange}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">ICP备案</label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">ICP证</label>
          <input
            type="text"
            name="icpLicense"
            value={formData.icpLicense}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">备注</label>
        <textarea
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          rows="3"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
        ></textarea>
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
        >
          保存
        </button>
      </div>
    </form>
  );
};

// 主页面组件
const DomainList = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentDomain, setCurrentDomain] = useState(null);
  const [fileInput, setFileInput] = useState(null);

  // 获取所有域名
  const fetchDomains = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/domains');
      setDomains(response.data);
    } catch (error) {
      console.error('获取域名失败:', error);
      toast.error('获取域名失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchDomains();
  }, []);

  // 打开新增域名模态框
  const handleAddDomain = () => {
    setCurrentDomain(null);
    setShowModal(true);
  };

  // 打开编辑域名模态框
  const handleEditDomain = (domain) => {
    setCurrentDomain(domain);
    setShowModal(true);
  };

  // 删除域名
  const handleDeleteDomain = async (id) => {
    if (window.confirm('确定要删除此域名吗？')) {
      try {
        await axios.delete(`/api/domains/${id}`);
        toast.success('域名删除成功');
        fetchDomains();
      } catch (error) {
        console.error('删除域名失败:', error);
        toast.error('删除域名失败');
      }
    }
  };

  // 提交域名表单
  const handleSubmitDomain = async (formData) => {
    try {
      if (currentDomain) {
        // 更新现有域名
        await axios.put(`/api/domains/${currentDomain._id}`, formData);
        toast.success('域名更新成功');
      } else {
        // 创建新域名
        await axios.post('/api/domains', formData);
        toast.success('域名添加成功');
      }
      setShowModal(false);
      fetchDomains();
    } catch (error) {
      console.error('保存域名失败:', error);
      toast.error('保存域名失败');
    }
  };

  // 导出域名CSV
  const handleExportCSV = () => {
    const dataToExport = domains.map(domain => ({
      域名: domain.name,
      域名类型: domain.type,
      年续费价: domain.renewalFee,
      到期日期: format(new Date(domain.expiryDate), 'yyyy/MM/dd'),
      持有者: domain.holder,
      解析管理账号: domain.dnsAccount,
      解析管理方: domain.dnsManager,
      业务使用情况: domain.usage,
      ICP备案: domain.icpRegistration ? '是' : '否',
      ICP证: domain.icpLicense,
      备注: domain.notes,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `域名列表_${format(new Date(), 'yyyyMMdd')}.csv`);
    toast.success('CSV导出成功');
  };

  // 处理CSV文件导入
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileInput(file);
    }
  };

  // 导入CSV文件
  const handleImportCSV = async () => {
    if (!fileInput) {
      toast.error('请选择要导入的CSV文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target.result;
        const results = Papa.parse(csv, {
          header: true,
          skipEmptyLines: true,
        });

        if (results.data && results.data.length > 0) {
          // 提取数据
          const domainsToImport = results.data.map(row => {
            // 根据CSV的列名映射到数据库字段
            return {
              name: row['域名'] || row['name'],
              type: row['域名类型'] || row['type'],
              renewalFee: row['年续费价'] || row['renewalFee'],
              expiryDate: row['到期日期'] || row['expiryDate'],
              holder: row['持有者'] || row['holder'],
              dnsAccount: row['解析管理账号'] || row['dnsAccount'],
              dnsManager: row['解析管理方'] || row['dnsManager'],
              usage: row['业务使用情况'] || row['usage'],
              icpRegistration: row['ICP备案'] === '是' || row['icpRegistration'] === 'true',
              icpLicense: row['ICP证'] || row['icpLicense'],
              notes: row['备注'] || row['notes'],
            };
          });

          // 发送到后端
          await axios.post('/api/domains/import', { domains: domainsToImport });
          setShowImportModal(false);
          setFileInput(null);
          toast.success(`成功导入 ${domainsToImport.length} 个域名`);
          fetchDomains();
        } else {
          toast.error('CSV文件格式不正确或没有数据');
        }
      } catch (error) {
        console.error('导入失败:', error);
        toast.error('导入失败，请检查CSV格式');
      }
    };
    reader.readAsText(fileInput);
  };

  // 运行域名检查任务
  const handleRunDomainCheck = async () => {
    try {
      await axios.post('/api/domains/check');
      toast.success('域名检查任务已启动，这可能需要一些时间');
    } catch (error) {
      console.error('启动域名检查失败:', error);
      toast.error('启动域名检查失败');
    }
  };

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">域名列表</h1>
        <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
          <button
            onClick={handleAddDomain}
            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-secondary-600 rounded-md hover:bg-secondary-700"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            添加域名
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
          >
            <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
            导入CSV
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
            导出CSV
          </button>
          <button
            onClick={handleRunDomainCheck}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            检查到期日期
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <DomainTable
          domains={domains}
          onEdit={handleEditDomain}
          onDelete={handleDeleteDomain}
          onRefresh={fetchDomains}
        />
      )}

      {/* 域名表单模态框 */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
            <div
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200 mb-4">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    {currentDomain ? '编辑域名' : '添加域名'}
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <DomainForm
                  domain={currentDomain}
                  onSubmit={handleSubmitDomain}
                  onCancel={() => setShowModal(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV导入模态框 */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
            <div
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200 mb-4">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    导入CSV文件
                  </h3>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-4">
                    请上传包含域名信息的CSV文件。文件应包含以下列：域名、域名类型、年续费价、到期日期等。
                  </p>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none"
                        >
                          <span>选择文件</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            accept=".csv"
                            className="sr-only"
                            onChange={handleImportFile}
                          />
                        </label>
                        <p className="pl-1">或拖放文件到此处</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        仅支持 CSV 文件
                      </p>
                    </div>
                  </div>
                  {fileInput && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        已选择文件: {fileInput.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleImportCSV}
                >
                  导入
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowImportModal(false)}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DomainList;
