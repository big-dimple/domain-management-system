import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { SSLCertificateForm } from '../components/SSLCertificateForm';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatCard } from '../components/StatCard';
import { 
  Shield, Plus, Upload, Download, RefreshCw, Search,
  CheckCircle, AlertTriangle, XCircle, Clock, ExternalLink, Info
} from 'lucide-react';

export const SSLPage = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [scanTask, setScanTask] = useState(null);
  const [importResults, setImportResults] = useState(null);

  // 获取证书列表
  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 20,
        search: searchTerm,
        status: filterStatus
      };
      const res = await axios.get('/api/ssl/certificates', { params });
      setCertificates(res.data.data);
      setTotalPages(res.data.pagination.pages);
    } catch (error) {
      toast.error('获取证书列表失败');
    }
    setLoading(false);
  };

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/stats');
      setStats(res.data.ssl);
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  };

  // 监控扫描任务
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
          fetchCertificates();
          fetchStats();
          setTimeout(() => setScanTask(null), 5000);
        }
      } catch (error) {
        console.error('获取任务状态失败:', error);
      }
    };
    
    checkProgress();
  };

  useEffect(() => {
    fetchCertificates();
    fetchStats();
  }, [currentPage, searchTerm, filterStatus]);

  // 手动扫描
  const handleManualScan = async () => {
    if (confirm('确定要扫描所有SSL证书状态吗？这可能需要几分钟时间。')) {
      try {
        const res = await axios.post('/api/scan/ssl');
        toast.success('SSL扫描任务已启动');
        monitorScanTask(res.data.taskId);
      } catch (error) {
        toast.error('启动扫描失败');
      }
    }
  };

  // TXT导入 - 增强版
  const handleImport = async () => {
    const domains = importText.split('\n')
      .map(d => d.trim())
      .filter(d => d.length > 0);
    
    if (domains.length === 0) {
      toast.error('请输入至少一个域名');
      return;
    }

    const loadingToast = toast.loading(`正在导入 ${domains.length} 个域名...`);
    setImportResults(null);

    try {
      const res = await axios.post('/api/ssl/import', { domains });
      
      // 解析结果
      const results = res.data;
      setImportResults(results);
      
      // 显示详细结果
      if (results.failed > 0) {
        toast.error(
          <div>
            <p>导入完成，有 {results.failed} 个域名失败</p>
            <p className="text-sm mt-1">请查看详细信息</p>
          </div>, 
          { id: loadingToast, duration: 5000 }
        );
      } else {
        toast.success(results.message, { id: loadingToast });
      }
      
      if (results.success > 0) {
        fetchCertificates();
        fetchStats();
      }
    } catch (error) {
      toast.error('导入失败: ' + error.message, { id: loadingToast });
    }
  };

  // TXT导出
  const handleExport = async () => {
    try {
      const res = await axios.get('/api/ssl/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ssl_certificates_${dayjs().format('YYYYMMDD')}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('导出成功');
    } catch (error) {
      toast.error('导出失败');
    }
  };

  // 保存证书
  const handleSave = async (certData) => {
    try {
      if (editingCert) {
        await axios.put(`/api/ssl/certificates/${editingCert._id}`, certData);
        toast.success('证书更新成功');
      } else {
        await axios.post('/api/ssl/certificates', certData);
        toast.success('证书添加成功，正在扫描...');
        // 触发单个域名扫描
        handleManualScan();
      }
      setShowAddForm(false);
      setEditingCert(null);
      fetchCertificates();
      fetchStats();
    } catch (error) {
      toast.error('保存失败: ' + (error.response?.data?.error || error.message));
    }
  };

  // 删除证书
  const handleDelete = async (id) => {
    if (confirm('确定删除这个SSL证书记录吗？')) {
      try {
        await axios.delete(`/api/ssl/certificates/${id}`);
        toast.success('证书删除成功');
        fetchCertificates();
        fetchStats();
      } catch (error) {
        toast.error('删除失败');
      }
    }
  };

  // 获取状态徽章
  const getStatusBadge = (status) => {
    return (
      <span className={`ssl-status-badge ${status}`}>
        {status === 'active' ? '正常' :
         status === 'warning' ? '即将到期' :
         status === 'critical' ? '紧急' :
         status === 'expired' ? '已过期' : '错误'}
      </span>
    );
  };

  // 计算统计数据
  const calculateStats = () => {
    if (!stats || !stats.byStatus) return { total: 0, active: 0, warning: 0, critical: 0 };
    
    const statusMap = {};
    stats.byStatus.forEach(item => {
      statusMap[item._id] = item.count;
    });
    
    return {
      total: stats.total || 0,
      active: statusMap.active || 0,
      warning: statusMap.warning || 0,
      critical: (statusMap.critical || 0) + (statusMap.expired || 0)
    };
  };

  const statsData = calculateStats();

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">SSL 证书监控</h1>
        <p className="text-gray-600">监控所有域名的 SSL 证书到期状态</p>
      </div>

      {/* 扫描进度条 */}
      {scanTask && scanTask.status === 'running' && (
        <div className="card p-4 mb-6 animate-slideIn">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">
              正在扫描SSL证书状态...
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="总证书数" value={statsData.total} icon={Shield} color="blue" />
        <StatCard title="正常运行" value={statsData.active} icon={CheckCircle} color="green" />
        <StatCard title="即将到期" value={statsData.warning} icon={AlertTriangle} color="yellow" />
        <StatCard title="紧急/过期" value={statsData.critical} icon={XCircle} color="red" />
      </div>

      {/* 操作栏 */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索域名..."
                className="input-modern pl-12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <select
            className="input-modern w-auto"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">所有状态</option>
            <option value="active">正常</option>
            <option value="warning">即将到期</option>
            <option value="critical">紧急</option>
            <option value="expired">已过期</option>
          </select>
          
          <button
            onClick={() => { setEditingCert(null); setShowAddForm(true); }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            添加监控域名
          </button>
          
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            导入TXT
          </button>
          
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出TXT
          </button>
          
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
        </div>
      </div>

      {/* 证书列表 */}
      <div className="card overflow-hidden">
        <table className="table-modern">
          <thead>
            <tr>
              <th>域名</th>
              <th>颁发机构</th>
              <th>有效期</th>
              <th>剩余天数</th>
              <th>状态</th>
              <th>证书类型</th>
              <th>最后检查</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-8">
                  <LoadingSpinner />
                </td>
              </tr>
            ) : certificates.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500">暂无数据</td>
              </tr>
            ) : (
              certificates.map(cert => (
                <tr key={cert._id} className={cert.status === 'expired' ? 'bg-red-50' : cert.status === 'critical' ? 'bg-orange-50' : ''}>
                  <td className="font-medium">
                    {cert.domain}
                    {cert.alternativeNames && cert.alternativeNames.length > 1 && (
                      <span className="text-xs text-gray-500 ml-1">
                        (+{cert.alternativeNames.length - 1})
                      </span>
                    )}
                  </td>
                  <td>{cert.issuer || '-'}</td>
                  <td>
                    <div className="text-sm">
                      <div>{dayjs(cert.validFrom).format('YYYY-MM-DD')}</div>
                      <div className="text-gray-500">至 {dayjs(cert.validTo).format('YYYY-MM-DD')}</div>
                    </div>
                  </td>
                  <td>
                    <span className={cert.daysRemaining <= 30 ? 'text-red-600 font-medium' : ''}>
                      {cert.daysRemaining >= 0 ? `${cert.daysRemaining} 天` : '已过期'}
                    </span>
                  </td>
                  <td>{getStatusBadge(cert.status)}</td>
                  <td>
                    {cert.isWildcard && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        通配符
                      </span>
                    )}
                    {cert.autoRenew && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-1">
                        自动续期
                      </span>
                    )}
                  </td>
                  <td>
                    {cert.lastChecked ? (
                      <span className="text-sm text-gray-600">
                        {dayjs(cert.lastChecked).format('MM-DD HH:mm')}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <button
                      onClick={() => { setEditingCert(cert); setShowAddForm(true); }}
                      className="text-blue-500 hover:text-blue-700 mr-3 transition-colors text-sm"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(cert._id)}
                      className="text-red-500 hover:text-red-700 transition-colors text-sm"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
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
        <SSLCertificateForm
          certificate={editingCert}
          onSave={handleSave}
          onCancel={() => { setShowAddForm(false); setEditingCert(null); }}
        />
      )}

      {/* 导入模态框 - 增强版 */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">导入域名列表</h3>
            
            {/* 提示信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">导入提示：</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>每行输入一个域名</li>
                    <li>系统将自动检测SSL证书状态</li>
                    <li>内部域名可能因网络限制无法访问</li>
                    <li>如遇访问失败，请联系管理员添加IP白名单</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <textarea
              className="input-modern h-40 font-mono text-sm"
              placeholder="example.com&#10;api.example.com&#10;test.example.com"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            
            {/* 导入结果显示 */}
            {importResults && (
              <div className={`mt-4 p-4 rounded-lg ${importResults.failed > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                <h4 className="font-medium mb-2">导入结果：</h4>
                <div className="text-sm space-y-1">
                  <p className="text-green-700">✓ 成功：{importResults.success} 个</p>
                  {importResults.failed > 0 && (
                    <>
                      <p className="text-red-700">✗ 失败：{importResults.failed} 个</p>
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        <p className="font-medium text-red-800 mb-1">失败详情：</p>
                        {importResults.errors.map((err, idx) => (
                          <div key={idx} className="text-xs text-red-700 mb-1">
                            • {err.domain}: {err.error}
                            {err.error.includes('ENOTFOUND') && (
                              <span className="text-yellow-700 ml-1">(可能需要添加IP白名单)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => { 
                  setShowImportModal(false); 
                  setImportText(''); 
                  setImportResults(null); 
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                关闭
              </button>
              <button 
                onClick={handleImport} 
                className="btn-primary"
                disabled={!importText.trim()}
              >
                导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
