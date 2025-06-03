import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { DomainForm } from '../components/DomainForm';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Tooltip } from '../components/Tooltip';
import { 
  Plus, Upload, Download, RefreshCw, Search, Settings, 
  AlertTriangle, CheckCircle, Clock, FileText, Zap,
  ChevronDown, Filter, X
} from 'lucide-react';

export const HomePage = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);
  const [stats, setStats] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [importResult, setImportResult] = useState(null);
  const [scanTask, setScanTask] = useState(null);
  
  // 筛选状态
  const [filters, setFilters] = useState({
    renewalSuggestion: '',
    scanStatus: '',
    hasICP: '',
    domainType: ''
  });
  
  // 筛选下拉显示状态
  const [filterDropdowns, setFilterDropdowns] = useState({
    renewalSuggestion: false,
    scanStatus: false,
    hasICP: false,
    domainType: false
  });

  // 用于处理点击外部关闭下拉菜单
  const filterRefs = useRef({});

  // 获取域名列表
  const fetchDomains = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 20,
        search: searchTerm
      };
      
      // 添加筛选参数
      Object.keys(filters).forEach(key => {
        if (filters[key] !== '') {
          params[key] = filters[key];
        }
      });
      
      const res = await axios.get('/api/domains', { params });
      setDomains(res.data.data);
      setTotalPages(res.data.pagination.pages);
    } catch (error) {
      toast.error('获取域名列表失败');
    }
    setLoading(false);
  };

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/stats');
      setStats(res.data);
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  };

  // 监控扫描任务进度
  const monitorScanTask = async (taskId) => {
    const checkProgress = async () => {
      try {
        const res = await axios.get(`/api/scan-tasks/${taskId}`);
        setScanTask(res.data);
        
        if (res.data.status === 'running') {
          setTimeout(checkProgress, 2000);
        } else {
          if (res.data.status === 'completed') {
            toast.success(`扫描完成！成功: ${res.data.progress.success}, 失败: ${res.data.progress.failed}`);
          } else {
            toast.error('扫描任务失败');
          }
          fetchDomains();
          fetchStats();
          setTimeout(() => setScanTask(null), 5000);
        }
      } catch (error) {
        console.error('获取任务状态失败:', error);
      }
    };
    
    checkProgress();
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      // 检查是否点击了任何筛选下拉菜单外部
      let shouldClose = false;
      const activeDropdowns = Object.keys(filterDropdowns).filter(key => filterDropdowns[key]);
      
      for (const key of activeDropdowns) {
        const ref = filterRefs.current[key];
        if (ref && !ref.contains(event.target)) {
          shouldClose = true;
          break;
        }
      }
      
      if (shouldClose) {
        setFilterDropdowns({
          renewalSuggestion: false,
          scanStatus: false,
          hasICP: false,
          domainType: false
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [filterDropdowns]);

  useEffect(() => {
    fetchDomains();
    fetchStats();
  }, [currentPage, searchTerm, filters]);

  // 处理筛选变化
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // 重置到第一页
    setFilterDropdowns(prev => ({ ...prev, [key]: false })); // 关闭下拉
  };

  // 清除筛选
  const clearFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: '' }));
    setCurrentPage(1);
  };

  // 清除所有筛选
  const clearAllFilters = () => {
    setFilters({
      renewalSuggestion: '',
      scanStatus: '',
      hasICP: '',
      domainType: ''
    });
    setCurrentPage(1);
  };

  // 判断是否有筛选
  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // 手动触发扫描
  const handleManualScan = async () => {
    if (confirm('确定要扫描所有域名的到期日期吗？这可能需要几分钟时间。')) {
      try {
        const res = await axios.post('/api/scan/domains');
        toast.success('扫描任务已启动');
        monitorScanTask(res.data.taskId);
      } catch (error) {
        toast.error('启动扫描失败');
      }
    }
  };

  // 批量评估
  const handleEvaluateAll = async () => {
    const loadingToast = toast.loading('正在批量评估续费建议...');
    try {
      const res = await axios.post('/api/evaluate/domains');
      toast.success(res.data.message, { id: loadingToast });
      fetchDomains();
      fetchStats();
    } catch (error) {
      toast.error('批量评估失败', { id: loadingToast });
    }
  };

  // CSV导入
  const handleImport = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const loadingToast = toast.loading('正在导入CSV文件...');
    setImportResult(null);
    
    try {
      const res = await axios.post('/api/domains/import', formData);
      
      if (res.data.success) {
        toast.success(`导入完成！新增: ${res.data.success}, 更新: ${res.data.updated || 0}, 失败: ${res.data.failed}`, {
          id: loadingToast,
          duration: 5000
        });
      } else {
        toast.error(`导入失败: ${res.data.error}`, {
          id: loadingToast,
          duration: 5000
        });
      }
      
      setImportResult(res.data);
      fetchDomains();
      fetchStats();
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      toast.error('CSV导入失败: ' + errorMsg, { id: loadingToast });
    }
  };

  // CSV导出
  const handleExport = async () => {
    try {
      const res = await axios.get('/api/domains/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `domains_${dayjs().format('YYYYMMDD')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV导出成功');
    } catch (error) {
      toast.error('CSV导出失败');
    }
  };

  // 保存域名
  const handleSave = async (domainData) => {
    try {
      if (editingDomain) {
        await axios.put(`/api/domains/${editingDomain._id}`, domainData);
        toast.success('域名更新成功');
      } else {
        await axios.post('/api/domains', domainData);
        toast.success('域名添加成功');
      }
      setShowAddForm(false);
      setEditingDomain(null);
      fetchDomains();
      fetchStats();
    } catch (error) {
      toast.error('保存失败: ' + (error.response?.data?.error || error.message));
    }
  };

  // 删除域名
  const handleDelete = async (id) => {
    if (confirm('确定删除这个域名吗？')) {
      try {
        await axios.delete(`/api/domains/${id}`);
        toast.success('域名删除成功');
        fetchDomains();
        fetchStats();
      } catch (error) {
        toast.error('删除失败');
      }
    }
  };

  // 获取续费建议标签
  const getRenewalBadge = (suggestion) => {
    return (
      <span className={`renewal-badge ${suggestion}`}>
        {suggestion}
      </span>
    );
  };

  // 获取扫描状态标签
  const getScanStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: '待扫描' },
      scanning: { bg: 'bg-blue-100', text: 'text-blue-800', label: '扫描中' },
      success: { bg: 'bg-green-100', text: 'text-green-800', label: '已扫描' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: '扫描失败' },
      error: { bg: 'bg-red-100', text: 'text-red-800', label: '扫描错误' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded text-xs ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // 修复后的筛选下拉组件
  const FilterDropdown = ({ columnKey, title, options, value }) => (
    <div 
      className="relative inline-block ml-1" 
      ref={el => filterRefs.current[columnKey] = el}
    >
      <button
        onClick={() => setFilterDropdowns(prev => ({ 
          ...prev, 
          [columnKey]: !prev[columnKey] 
        }))}
        className={`p-1 rounded hover:bg-gray-100 transition-colors ${value ? 'text-blue-600' : 'text-gray-400'}`}
      >
        <Filter className="w-3 h-3" />
      </button>
      
      {filterDropdowns[columnKey] && (
        <div 
          className="absolute z-50 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200"
          style={{
            // 确保下拉菜单有足够的最小高度，不会被数据行数影响
            minHeight: '180px',
            // 智能定位：如果空间不够就向上展开
            top: window.innerHeight - event?.target?.getBoundingClientRect().bottom < 200 ? 'auto' : '100%',
            bottom: window.innerHeight - event?.target?.getBoundingClientRect().bottom < 200 ? '100%' : 'auto'
          }}
        >
          <div className="p-2">
            <div className="text-xs font-medium text-gray-700 mb-2">{title}</div>
            <div className="max-h-32 overflow-y-auto">
              {options.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleFilterChange(columnKey, option.value)}
                  className={`block w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 transition-colors ${
                    value === option.value ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {value && (
              <div className="border-t border-gray-200 mt-2 pt-2">
                <button
                  onClick={() => clearFilter(columnKey)}
                  className="block w-full text-left px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  清除筛选
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">域名管理</h1>
        <p className="text-gray-600">管理和监控所有域名的到期状态</p>
      </div>

      {/* 扫描任务进度条 */}
      {scanTask && scanTask.status === 'running' && (
        <div className="card p-4 mb-6 animate-slideIn">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">
              正在扫描域名到期日期...
            </span>
            <span className="text-sm text-blue-600">
              {scanTask.progress.scanned} / {scanTask.progress.total} ({scanTask.progress.percentage}%)
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${scanTask.progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="stat-card">
            <h3 className="text-gray-500 text-sm">总域名数</h3>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.domain.total}</p>
          </div>
          <div className="stat-card">
            <h3 className="text-gray-500 text-sm">7天内到期</h3>
            <p className="text-2xl font-bold text-red-500 mt-1">{stats.domain.urgentExpiring}</p>
          </div>
          <div className="stat-card">
            <h3 className="text-gray-500 text-sm">30天内到期</h3>
            <p className="text-2xl font-bold text-orange-500 mt-1">{stats.domain.expiringSoon}</p>
          </div>
          <div className="stat-card">
            <h3 className="text-gray-500 text-sm">紧急续费</h3>
            <p className="text-2xl font-bold text-red-500 mt-1">
              {stats.domain.byRenewalSuggestion.find(s => s._id === '紧急续费')?.count || 0}
            </p>
          </div>
          <div className="stat-card">
            <h3 className="text-gray-500 text-sm">建议续费</h3>
            <p className="text-2xl font-bold text-green-500 mt-1">
              {stats.domain.byRenewalSuggestion.find(s => s._id === '建议续费')?.count || 0}
            </p>
          </div>
          <div className="stat-card">
            <h3 className="text-gray-500 text-sm">待扫描</h3>
            <p className="text-2xl font-bold text-blue-500 mt-1">
              {stats.domain.byScanStatus?.find(s => s._id === 'pending')?.count || 0}
            </p>
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div className="card p-4 mb-6">
        {/* 搜索和筛选栏 */}
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索域名或持有者..."
                className="input-modern pl-12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* 筛选标签显示 */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">筛选：</span>
              {Object.entries(filters).map(([key, value]) => {
                if (!value) return null;
                const labels = {
                  renewalSuggestion: '续费建议',
                  scanStatus: '扫描状态',
                  hasICP: 'ICP证',
                  domainType: '域名类型'
                };
                return (
                  <span
                    key={key}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                  >
                    {labels[key]}: {value === 'true' ? '是' : value === 'false' ? '否' : value}
                    <button
                      onClick={() => clearFilter(key)}
                      className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              <button
                onClick={clearAllFilters}
                className="text-xs text-red-600 hover:text-red-800"
              >
                清除全部
              </button>
            </div>
          )}
        </div>
        
        {/* 操作按钮栏 */}
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={() => { setEditingDomain(null); setShowAddForm(true); }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            添加域名
          </button>
          
          <label className="px-4 py-2 bg-orange-500 text-white rounded-md cursor-pointer hover:bg-orange-600 transition-colors flex items-center gap-2">
            <Upload className="w-4 h-4" />
            导入CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files[0] && handleImport(e.target.files[0])}
            />
          </label>
          
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出CSV
          </button>
          
          <div className="flex-1"></div>
          
          <Tooltip text="使用whois查询获取域名真实到期日期">
            <button
              onClick={handleManualScan}
              className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors flex items-center gap-2"
              disabled={scanTask && scanTask.status === 'running'}
            >
              {scanTask && scanTask.status === 'running' ? (
                <>
                  <LoadingSpinner size="sm" />
                  扫描中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  批量扫描
                </>
              )}
            </button>
          </Tooltip>
          
          <Tooltip text="根据预设标准评估续费建议">
            <button
              onClick={handleEvaluateAll}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              批量评估
            </button>
          </Tooltip>
          
        </div>
        
        {/* CSV导入结果显示 */}
        {importResult && (
          <div className={`mt-4 p-4 rounded-md animate-slideIn ${importResult.success !== false ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h4 className="font-semibold mb-2">导入结果：</h4>
            <div className="text-sm">
              <p>总行数：{importResult.total || 0}</p>
              <p className="text-green-600">新增成功：{importResult.success || 0}</p>
              <p className="text-blue-600">更新成功：{importResult.updated || 0}</p>
              <p className="text-red-600">导入失败：{importResult.failed || 0}</p>
            </div>
            <button 
              onClick={() => setImportResult(null)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700"
            >
              关闭
            </button>
          </div>
        )}
      </div>

      {/* 域名列表 - 增加最小高度确保筛选菜单有足够空间 */}
      <div className="card overflow-hidden" style={{ minHeight: '600px' }}>
        <table className="table-modern">
          <thead>
            <tr>
              <th>域名</th>
              <th>
                <span className="inline-flex items-center">
                  域名类型
                  <FilterDropdown
                    columnKey="domainType"
                    title="域名类型"
                    options={[
                      { value: 'gTLD', label: 'gTLD' },
                      { value: 'ccTLD', label: 'ccTLD' },
                      { value: 'New gTLD', label: 'New gTLD' }
                    ]}
                    value={filters.domainType}
                  />
                </span>
              </th>
              <th>到期日期</th>
              <th>持有者</th>
              <th>业务使用</th>
              <th>
                <span className="inline-flex items-center">
                  ICP证
                  <FilterDropdown
                    columnKey="hasICP"
                    title="ICP证"
                    options={[
                      { value: 'true', label: '是' },
                      { value: 'false', label: '否' }
                    ]}
                    value={filters.hasICP}
                  />
                </span>
              </th>
              <th>续费价格</th>
              <th>
                <span className="inline-flex items-center">
                  续费建议
                  <FilterDropdown
                    columnKey="renewalSuggestion"
                    title="续费建议"
                    options={[
                      { value: '紧急续费', label: '紧急续费' },
                      { value: '建议续费', label: '建议续费' },
                      { value: '保持续费', label: '保持续费' },
                      { value: '请示领导', label: '请示领导' },
                      { value: '待评估', label: '待评估' },
                      { value: '不续费', label: '不续费' }
                    ]}
                    value={filters.renewalSuggestion}
                  />
                </span>
              </th>
              <th>
                <span className="inline-flex items-center">
                  扫描状态
                  <FilterDropdown
                    columnKey="scanStatus"
                    title="扫描状态"
                    options={[
                      { value: 'pending', label: '待扫描' },
                      { value: 'success', label: '已扫描' },
                      { value: 'failed', label: '扫描失败' }
                    ]}
                    value={filters.scanStatus}
                  />
                </span>
              </th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" className="text-center py-8">
                  <LoadingSpinner />
                </td>
              </tr>
            ) : domains.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center py-8 text-gray-500">
                  {hasActiveFilters ? '未找到符合条件的域名' : '暂无数据'}
                </td>
              </tr>
            ) : (
              domains.map(domain => {
                const daysToExpiry = dayjs(domain.expiryDate).diff(dayjs(), 'day');
                const isExpiringSoon = daysToExpiry <= 30 && daysToExpiry >= 0;
                const isExpired = daysToExpiry < 0;
                
                return (
                  <tr key={domain._id} className={`${isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-orange-50' : ''}`}>
                    <td className="font-medium">{domain.domainName}</td>
                    <td>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {domain.domainType || 'gTLD'}
                      </span>
                    </td>
                    <td>
                      <span className={`${isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-orange-600 font-semibold' : ''}`}>
                        {dayjs(domain.expiryDate).format('YYYY-MM-DD')}
                        {(isExpiringSoon || isExpired) && (
                          <span className="ml-1 text-xs">
                            ({isExpired ? '已过期' : `${daysToExpiry}天`})
                          </span>
                        )}
                      </span>
                      {domain.autoScanned && (
                        <span className="ml-1 text-xs text-blue-600" title="自动扫描更新">🔄</span>
                      )}
                    </td>
                    <td className="text-gray-600">{domain.holder || '-'}</td>
                    <td className="text-gray-600">{domain.businessUsage || '-'}</td>
                    <td>
                      <span className={domain.hasICP ? 'text-green-600 font-medium' : 'text-gray-600'}>
                        {domain.hasICP ? '是' : '否'}
                      </span>
                    </td>
                    <td className="text-gray-600">{domain.renewalPrice || '-'}</td>
                    <td>{getRenewalBadge(domain.renewalSuggestion)}</td>
                    <td>
                      {getScanStatusBadge(domain.scanStatus)}
                      {domain.lastScanned && (
                        <div className="text-xs text-gray-500 mt-1">
                          {dayjs(domain.lastScanned).format('MM-DD HH:mm')}
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => { setEditingDomain(domain); setShowAddForm(true); }}
                        className="text-blue-500 hover:text-blue-700 mr-3 transition-colors text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(domain._id)}
                        className="text-red-500 hover:text-red-700 transition-colors text-sm"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 flex justify-center items-center space-x-2 border-t">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors"
            >
              上一页
            </button>
            <span className="px-3 py-1 text-sm">
              第 {currentPage} 页，共 {totalPages} 页
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors"
            >
              下一页
            </button>
          </div>
        )}
      </div>

      {/* 表单弹窗 */}
      {showAddForm && (
        <DomainForm
          domain={editingDomain}
          onSave={handleSave}
          onCancel={() => { setShowAddForm(false); setEditingDomain(null); }}
        />
      )}
      
    </div>
  );
};
