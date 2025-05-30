import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { 
  Settings, Save, RotateCcw, Clock, Shield, Bell, 
  Database, Zap, AlertTriangle, Check, Info
} from 'lucide-react';

export const SettingsPage = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await axios.get('/api/settings');
      setConfig(res.data);
      setLoading(false);
    } catch (error) {
      toast.error('获取配置失败');
      setLoading(false);
    }
  };

  const handleChange = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post('/api/settings', config);
      toast.success('配置已保存');
      setHasChanges(false);
    } catch (error) {
      toast.error('保存失败: ' + (error.response?.data?.error || error.message));
    }
    setSaving(false);
  };

  const handleReset = () => {
    if (confirm('确定要重置所有设置为默认值吗？')) {
      fetchConfig();
      setHasChanges(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: '常规设置', icon: Settings },
    { id: 'scan', label: '扫描设置', icon: Clock },
    { id: 'ssl', label: 'SSL设置', icon: Shield },
    { id: 'alert', label: '告警设置', icon: Bell },
    { id: 'advanced', label: '高级设置', icon: Zap }
  ];

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">系统设置</h1>
        <p className="text-gray-600">配置域名管理系统的各项参数</p>
      </div>

      {/* 提示信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">设置说明</p>
            <p>这些设置保存在数据库中，不会修改系统环境变量。部分设置（如端口、定时任务）需要重启系统才能生效。</p>
          </div>
        </div>
      </div>

      {/* 未保存提示 */}
      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-sm text-yellow-800">您有未保存的更改</span>
          </div>
          <div className="space-x-2">
            <button
              onClick={handleReset}
              className="px-3 py-1 text-sm border border-yellow-600 text-yellow-600 rounded hover:bg-yellow-100"
            >
              重置
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
              disabled={saving}
            >
              {saving ? '保存中...' : '保存更改'}
            </button>
          </div>
        </div>
      )}

      {/* 标签页 */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-6" aria-label="Tabs">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* 设置内容 */}
        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">常规设置</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      日志级别
                    </label>
                    <select
                      className="input-modern"
                      value={config.general.LOG_LEVEL || 'info'}
                      onChange={(e) => handleChange('general', 'LOG_LEVEL', e.target.value)}
                    >
                      <option value="debug">调试</option>
                      <option value="info">信息</option>
                      <option value="warn">警告</option>
                      <option value="error">错误</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CSV最大大小
                    </label>
                    <input
                      type="text"
                      className="input-modern"
                      value={config.general.CSV_MAX_SIZE || '50MB'}
                      onChange={(e) => handleChange('general', 'CSV_MAX_SIZE', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CSV编码
                    </label>
                    <select
                      className="input-modern"
                      value={config.general.CSV_ENCODING || 'utf-8'}
                      onChange={(e) => handleChange('general', 'CSV_ENCODING', e.target.value)}
                    >
                      <option value="utf-8">UTF-8</option>
                      <option value="gbk">GBK</option>
                      <option value="gb2312">GB2312</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scan' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">域名扫描设置</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        className="rounded text-blue-500"
                        checked={config.scan.SCAN_ENABLED === 'true'}
                        onChange={(e) => handleChange('scan', 'SCAN_ENABLED', e.target.checked ? 'true' : 'false')}
                      />
                      <span className="text-sm font-medium text-gray-700">启用自动扫描</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      扫描时间 (Cron表达式)
                    </label>
                    <input
                      type="text"
                      className="input-modern"
                      value={config.scan.SCAN_CRON || '30 4 * * *'}
                      onChange={(e) => handleChange('scan', 'SCAN_CRON', e.target.value)}
                      placeholder="30 4 * * *"
                    />
                    <p className="text-xs text-gray-500 mt-1">默认: 每天凌晨4:30</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      扫描超时时间 (毫秒)
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.scan.SCAN_TIMEOUT || 30000}
                      onChange={(e) => handleChange('scan', 'SCAN_TIMEOUT', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      批量扫描数量
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.scan.SCAN_BATCH_SIZE || 10}
                      onChange={(e) => handleChange('scan', 'SCAN_BATCH_SIZE', e.target.value)}
                      min="1"
                      max="50"
                    />
                    <p className="text-xs text-gray-500 mt-1">同时扫描的域名数量</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ssl' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">SSL证书扫描设置</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        className="rounded text-blue-500"
                        checked={config.ssl.SSL_SCAN_ENABLED === 'true'}
                        onChange={(e) => handleChange('ssl', 'SSL_SCAN_ENABLED', e.target.checked ? 'true' : 'false')}
                      />
                      <span className="text-sm font-medium text-gray-700">启用SSL扫描</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SSL扫描时间
                    </label>
                    <input
                      type="text"
                      className="input-modern"
                      value={config.ssl.SSL_SCAN_CRON || '0 5 * * *'}
                      onChange={(e) => handleChange('ssl', 'SSL_SCAN_CRON', e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">默认: 每天凌晨5:00</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SSL扫描超时 (毫秒)
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.ssl.SSL_SCAN_TIMEOUT || 20000}
                      onChange={(e) => handleChange('ssl', 'SSL_SCAN_TIMEOUT', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SSL批量扫描数
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.ssl.SSL_SCAN_BATCH_SIZE || 5}
                      onChange={(e) => handleChange('ssl', 'SSL_SCAN_BATCH_SIZE', e.target.value)}
                      min="1"
                      max="20"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">SSL评估阈值</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      紧急天数
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.ssl.SSL_CRITICAL_DAYS || 7}
                      onChange={(e) => handleChange('ssl', 'SSL_CRITICAL_DAYS', e.target.value)}
                      min="1"
                      max="30"
                    />
                    <p className="text-xs text-gray-500 mt-1">少于此天数标记为紧急</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      警告天数
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.ssl.SSL_WARNING_DAYS || 30}
                      onChange={(e) => handleChange('ssl', 'SSL_WARNING_DAYS', e.target.value)}
                      min="7"
                      max="90"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      关注天数
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.ssl.SSL_ATTENTION_DAYS || 60}
                      onChange={(e) => handleChange('ssl', 'SSL_ATTENTION_DAYS', e.target.value)}
                      min="30"
                      max="180"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alert' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">告警设置</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        className="rounded text-blue-500"
                        checked={config.alert.ALERT_ENABLED === 'true'}
                        onChange={(e) => handleChange('alert', 'ALERT_ENABLED', e.target.checked ? 'true' : 'false')}
                      />
                      <span className="text-sm font-medium text-gray-700">启用告警通知</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      告警时间
                    </label>
                    <input
                      type="text"
                      className="input-modern"
                      value={config.alert.ALERT_CRON || '0 12 * * *'}
                      onChange={(e) => handleChange('alert', 'ALERT_CRON', e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">默认: 每天中午12:00</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">域名评估阈值</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      紧急续费天数
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.advanced.EVAL_URGENT_DAYS || 7}
                      onChange={(e) => handleChange('advanced', 'EVAL_URGENT_DAYS', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      建议续费天数
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.advanced.EVAL_SUGGEST_DAYS || 30}
                      onChange={(e) => handleChange('advanced', 'EVAL_SUGGEST_DAYS', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      保持续费天数
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.advanced.EVAL_ATTENTION_DAYS || 90}
                      onChange={(e) => handleChange('advanced', 'EVAL_ATTENTION_DAYS', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
            disabled={!hasChanges}
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
          <button
            onClick={handleSave}
            className="btn-primary flex items-center gap-2"
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存设置
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
