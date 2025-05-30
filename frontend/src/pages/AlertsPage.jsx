import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { AlertConfigForm } from '../components/AlertConfigForm';
import { 
  Bell, Plus, Send, History, Settings, AlertCircle,
  Globe, Shield, CheckCircle, XCircle, Clock
} from 'lucide-react';

export const AlertsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [alertConfigs, setAlertConfigs] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [alertStats, setAlertStats] = useState(null);

  useEffect(() => {
    fetchAlertConfigs();
    fetchAlertStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchScanHistory();
    }
  }, [activeTab]);

  const fetchAlertConfigs = async () => {
    try {
      const res = await axios.get('/api/alert-configs');
      setAlertConfigs(res.data);
    } catch (error) {
      console.error('获取告警配置失败:', error);
    }
  };

  const fetchAlertStats = async () => {
    try {
      const res = await axios.get('/api/stats');
      setAlertStats({
        domain: {
          urgent: res.data.domain.urgentExpiring || 0,
          soon: res.data.domain.expiringSoon || 0
        },
        ssl: {
          critical: res.data.ssl.byStatus?.find(s => s._id === 'critical')?.count || 0,
          warning: res.data.ssl.byStatus?.find(s => s._id === 'warning')?.count || 0
        },
        totalAlerts: res.data.alertConfigCount || 0
      });
    } catch (error) {
      console.error('获取告警统计失败:', error);
    }
  };

  const fetchScanHistory = async () => {
    try {
      const res = await axios.get('/api/scan-history');
      setScanHistory(res.data.data);
    } catch (error) {
      console.error('获取扫描历史失败:', error);
    }
  };

  const handleSaveConfig = async (configData) => {
    try {
      if (editingConfig) {
        await axios.put(`/api/alert-configs/${editingConfig._id}`, configData);
        toast.success('告警配置更新成功');
      } else {
        await axios.post('/api/alert-configs', configData);
        toast.success('告警配置添加成功');
      }
      setShowAlertForm(false);
      setEditingConfig(null);
      fetchAlertConfigs();
    } catch (error) {
      toast.error('保存失败: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteConfig = async (id) => {
    if (confirm('确定删除这个告警配置吗？')) {
      try {
        await axios.delete(`/api/alert-configs/${id}`);
        toast.success('告警配置删除成功');
        fetchAlertConfigs();
      } catch (error) {
        toast.error('删除失败');
      }
    }
  };

  const handleManualAlert = async () => {
    if (alertConfigs.filter(c => c.enabled).length === 0) {
      toast.error('请先配置并启用告警通知');
      return;
    }
    
    if (confirm('确定要立即发送到期提醒吗？')) {
      const loadingToast = toast.loading('正在发送告警...');
      try {
        await axios.post('/api/alerts/send');
        toast.success('告警已发送', { id: loadingToast });
      } catch (error) {
        toast.error('发送告警失败', { id: loadingToast });
      }
    }
  };

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">告警中心</h1>
        <p className="text-gray-600">统一管理域名和SSL证书的到期提醒</p>
      </div>

      {/* 告警统计概览 */}
      {alertStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">域名告警</h3>
              <Globe className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">7天内到期</span>
                <span className="text-sm font-medium text-red-600">{alertStats.domain.urgent}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">30天内到期</span>
                <span className="text-sm font-medium text-yellow-600">{alertStats.domain.soon}</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">SSL证书告警</h3>
              <Shield className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">紧急处理</span>
                <span className="text-sm font-medium text-red-600">{alertStats.ssl.critical}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">即将到期</span>
                <span className="text-sm font-medium text-yellow-600">{alertStats.ssl.warning}</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">通知配置</h3>
              <Bell className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">已配置</span>
                <span className="text-sm font-medium text-blue-600">{alertConfigs.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">已启用</span>
                <span className="text-sm font-medium text-green-600">
                  {alertConfigs.filter(c => c.enabled).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowAlertForm(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          添加告警配置
        </button>
        
        <button
          onClick={handleManualAlert}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          立即发送告警
        </button>
      </div>

      {/* 标签页 */}
      <div className="card">
        <div className="tab-nav">
          <button
            onClick={() => setActiveTab('overview')}
            className={`tab-item ${activeTab === 'overview' ? 'active' : ''}`}
          >
            告警配置
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`tab-item ${activeTab === 'rules' ? 'active' : ''}`}
          >
            告警规则
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
          >
            扫描历史
          </button>
        </div>

        {/* 标签页内容 */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div>
              {alertConfigs.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-4">暂无告警配置</p>
                  <button
                    onClick={() => setShowAlertForm(true)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    立即添加
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {alertConfigs.map(config => (
                    <div key={config._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900">{config.name}</h4>
                            <span className={`px-2 py-1 rounded text-xs ${
                              config.type === 'dingtalk' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {config.type === 'dingtalk' ? '钉钉' : '企业微信'}
                            </span>
                            {config.enabled ? (
                              <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                                已启用
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                                已禁用
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>告警内容：{config.alertTypes.includes('both') ? '域名 + SSL证书' : config.alertTypes[0] === 'domain' ? '仅域名' : '仅SSL证书'}</p>
                            <p>域名提前告警：{config.domainDaysBeforeExpiry}天</p>
                            <p>SSL提前告警：{config.sslDaysBeforeExpiry}天</p>
                            {config.lastAlertTime && (
                              <p>最后告警：{dayjs(config.lastAlertTime).format('YYYY-MM-DD HH:mm')}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => { setEditingConfig(config); setShowAlertForm(true); }}
                            className="text-blue-500 hover:text-blue-700 text-sm"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteConfig(config._id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      
                      {/* 告警历史 */}
                      {config.alertHistory && config.alertHistory.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">最近告警记录</h5>
                          <div className="space-y-1">
                            {config.alertHistory.slice(-3).reverse().map((history, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">
                                  {dayjs(history.sentAt).format('MM-DD HH:mm')}
                                </span>
                                {history.success ? (
                                  <span className="text-green-600">
                                    成功发送 {history.itemCount} 个提醒
                                  </span>
                                ) : (
                                  <span className="text-red-600">
                                    发送失败: {history.error}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">域名续费规则</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 紧急续费：7天内到期的有价值域名</li>
                  <li>• 建议续费：7-30天内到期的有价值域名</li>
                  <li>• 保持续费：30-90天内到期的有价值域名</li>
                  <li>• 请示领导：即将到期但价值不明的域名</li>
                </ul>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">SSL证书规则</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• 紧急状态：7天内到期</li>
                  <li>• 警告状态：7-30天内到期</li>
                  <li>• 正常状态：30天以上</li>
                  <li>• 自动续期的证书会特别标注</li>
                </ul>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">告警时机</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• 定时告警：每天中午12:00自动检查并发送</li>
                  <li>• 手动告警：可随时手动触发发送</li>
                  <li>• 智能去重：相同内容24小时内不会重复发送</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {scanHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  暂无扫描历史
                </div>
              ) : (
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>任务ID</th>
                      <th>类型</th>
                      <th>触发方式</th>
                      <th>状态</th>
                      <th>扫描数量</th>
                      <th>成功/失败</th>
                      <th>开始时间</th>
                      <th>用时</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanHistory.map(task => (
                      <tr key={task._id}>
                        <td className="font-mono text-sm">{task.taskId}</td>
                        <td>
                          <span className={`px-2 py-1 rounded text-xs ${
                            task.taskType === 'domain' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {task.taskType === 'domain' ? '域名' : 'SSL'}
                          </span>
                        </td>
                        <td>
                          <span className={`px-2 py-1 rounded text-xs ${
                            task.triggeredBy === 'scheduled' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {task.triggeredBy === 'scheduled' ? '定时' : '手动'}
                          </span>
                        </td>
                        <td>
                          <span className={`px-2 py-1 rounded text-xs ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'failed' ? 'bg-red-100 text-red-800' :
                            task.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status === 'completed' ? '完成' :
                             task.status === 'failed' ? '失败' :
                             task.status === 'running' ? '运行中' : '待处理'}
                          </span>
                        </td>
                        <td>{task.totalItems || 0}</td>
                        <td>
                          <span className="text-green-600">{task.successCount || 0}</span> / 
                          <span className="text-red-600"> {task.failureCount || 0}</span>
                        </td>
                        <td className="text-sm">
                          {task.startTime ? dayjs(task.startTime).format('MM-DD HH:mm:ss') : '-'}
                        </td>
                        <td className="text-sm">
                          {task.startTime && task.endTime ? 
                            `${Math.round((new Date(task.endTime) - new Date(task.startTime)) / 1000)}秒` : 
                            '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 告警配置表单 */}
      {showAlertForm && (
        <AlertConfigForm
          config={editingConfig}
          onSave={handleSaveConfig}
          onCancel={() => { setShowAlertForm(false); setEditingConfig(null); }}
        />
      )}
    </div>
  );
};
