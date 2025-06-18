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

  // 获取告警类型显示文本和样式
  const getAlertTypeDisplay = (type) => {
    const typeMap = {
      'dingtalk': { text: '钉钉', bg: 'bg-blue-100', color: 'text-blue-800' },
      'wechat': { text: '企业微信', bg: 'bg-green-100', color: 'text-green-800' },
      'feishu': { text: '飞书', bg: 'bg-purple-100', color: 'text-purple-800' }
    };
    return typeMap[type] || { text: type, bg: 'bg-gray-100', color: 'text-gray-800' };
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alertConfigs.map(config => {
          const typeDisplay = getAlertTypeDisplay(config.type);
          return (
            <div 
              key={config._id} 
              className={`relative border rounded-lg p-4 transition-all ${
                config.enabled 
                  ? 'border-gray-200 bg-white hover:shadow-md' 
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              {/* 状态标记 - 更醒目 */}
              <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                config.enabled ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              
              {/* 头部信息 */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-lg">{config.name}</h4>
                  <span className={`px-2 py-0.5 rounded text-xs ${typeDisplay.bg} ${typeDisplay.color}`}>
                    {typeDisplay.text}
                  </span>
                </div>
                
                {/* 状态标签 */}
                <div className="flex items-center gap-2">
                  {config.enabled ? (
                    <span className="inline-flex items-center text-xs text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      运行中
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs text-gray-500">
                      <XCircle className="w-3 h-3 mr-1" />
                      已禁用
                    </span>
                  )}
                </div>
              </div>
              
              {/* 配置信息 - 更紧凑 */}
              <div className="space-y-2 text-sm text-gray-600 mb-3">
                <div className="flex items-center">
                  <span className="text-gray-500 w-16">告警内容</span>
                  <span className="font-medium">
                    {config.alertTypes.includes('both') ? '域名 + SSL' : 
                     config.alertTypes[0] === 'domain' ? '仅域名' : '仅SSL'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 w-16">域名提醒</span>
                  <span>{config.domainDaysBeforeExpiry}天</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 w-16">SSL提醒</span>
                  <span>{config.sslDaysBeforeExpiry}天</span>
                </div>
              </div>
              
              {/* 最后告警时间 - 简化显示 */}
              {config.lastAlertTime && (
                <div className="text-xs text-gray-500 border-t pt-2">
                  最后告警：{dayjs(config.lastAlertTime).format('MM-DD HH:mm')}
                </div>
              )}
              
              {/* 操作按钮 */}
              <div className="flex justify-end gap-2 mt-3">
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
              
              {/* 告警历史 - 改为悬浮展示 */}
              {config.alertHistory && config.alertHistory.length > 0 && (
                <div className="group relative">
                  <button className="text-xs text-gray-400 hover:text-gray-600 mt-2">
                    历史记录 ({config.alertHistory.length})
                  </button>
                  
                  {/* 悬浮面板 */}
                  <div className="invisible group-hover:visible absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">最近告警记录</h5>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {config.alertHistory.slice(-5).reverse().map((history, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">
                            {dayjs(history.sentAt).format('MM-DD HH:mm')}
                          </span>
                          {history.success ? (
                            <span className="text-green-600">成功</span>
                          ) : (
                            <span className="text-red-600">失败</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
