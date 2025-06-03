import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { 
  Settings, Save, Clock, Shield, Bell, 
  AlertTriangle, Check, Info, RefreshCw
} from 'lucide-react';

export const SettingsPage = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('domain');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await axios.get('/api/evaluation/config');
      setConfig(res.data);
      setLoading(false);
    } catch (error) {
      toast.error('获取配置失败');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put('/api/evaluation/config', config);
      toast.success('配置已保存');
    } catch (error) {
      toast.error('保存失败: ' + (error.response?.data?.error || error.message));
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (confirm('确定要重置为默认值吗？')) {
      setConfig({
        domainConfig: {
          urgentDays: 7,
          suggestDays: 30,
          attentionDays: 90
        },
        sslConfig: {
          criticalDays: 7,
          warningDays: 30,
          attentionDays: 60
        }
      });
      toast.success('已重置为默认值，请点击保存生效');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">系统设置</h1>
        <p className="text-gray-600">配置域名和SSL证书的评估规则</p>
      </div>

      {/* 统一提示信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">配置说明</p>
            <p>这些设置决定了系统如何评估域名续费建议和SSL证书状态。所有配置保存在数据库中，立即生效。</p>
          </div>
        </div>
      </div>

      {/* 设置内容 */}
      <div className="card">
        {/* 标签导航 */}
        <div className="tab-nav">
          <button
            onClick={() => setActiveTab('domain')}
            className={`tab-item ${activeTab === 'domain' ? 'active' : ''}`}
          >
            域名续费评估
          </button>
          <button
            onClick={() => setActiveTab('ssl')}
            className={`tab-item ${activeTab === 'ssl' ? 'active' : ''}`}
          >
            SSL证书评估
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`tab-item ${activeTab === 'schedule' ? 'active' : ''}`}
          >
            定时任务
          </button>
        </div>
        
        <div className="p-6">
          {activeTab === 'domain' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">域名续费评估规则</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      紧急续费天数
                      <span className="text-gray-500 ml-1 font-normal">(红色提醒)</span>
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.domainConfig.urgentDays}
                      onChange={(e) => setConfig({
                        ...config,
                        domainConfig: {...config.domainConfig, urgentDays: parseInt(e.target.value)}
                      })}
                      min="1"
                      max="30"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      少于此天数的有价值域名将标记为"紧急续费"
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      建议续费天数
                      <span className="text-gray-500 ml-1 font-normal">(绿色提醒)</span>
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.domainConfig.suggestDays}
                      onChange={(e) => setConfig({
                        ...config,
                        domainConfig: {...config.domainConfig, suggestDays: parseInt(e.target.value)}
                      })}
                      min="7"
                      max="90"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      少于此天数的有价值域名将标记为"建议续费"
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      保持续费天数
                      <span className="text-gray-500 ml-1 font-normal">(蓝色提醒)</span>
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.domainConfig.attentionDays}
                      onChange={(e) => setConfig({
                        ...config,
                        domainConfig: {...config.domainConfig, attentionDays: parseInt(e.target.value)}
                      })}
                      min="30"
                      max="365"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      少于此天数的有价值域名将标记为"保持续费"
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">评估逻辑说明</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">有价值域名</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <span className="text-red-600">紧急续费</span>：{config.domainConfig.urgentDays}天内到期</li>
                      <li>• <span className="text-green-600">建议续费</span>：{config.domainConfig.urgentDays}-{config.domainConfig.suggestDays}天内</li>
                      <li>• <span className="text-blue-600">保持续费</span>：{config.domainConfig.suggestDays}-{config.domainConfig.attentionDays}天内</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">价值不明域名</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <span className="text-yellow-600">请示领导</span>：{config.domainConfig.suggestDays}天内到期</li>
                      <li>• <span className="text-gray-600">待评估</span>：时间充裕</li>
                      <li>• <span className="text-purple-600">不续费</span>：手动标记</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'ssl' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">SSL证书状态评估</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      紧急处理天数
                      <span className="text-gray-500 ml-1 font-normal">(红色警告)</span>
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.sslConfig.criticalDays}
                      onChange={(e) => setConfig({
                        ...config,
                        sslConfig: {...config.sslConfig, criticalDays: parseInt(e.target.value)}
                      })}
                      min="1"
                      max="14"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      少于此天数的证书将标记为"紧急"状态
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      警告天数
                      <span className="text-gray-500 ml-1 font-normal">(黄色警告)</span>
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.sslConfig.warningDays}
                      onChange={(e) => setConfig({
                        ...config,
                        sslConfig: {...config.sslConfig, warningDays: parseInt(e.target.value)}
                      })}
                      min="7"
                      max="60"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      少于此天数的证书将标记为"警告"状态
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      关注天数
                      <span className="text-gray-500 ml-1 font-normal">(正常状态阈值)</span>
                    </label>
                    <input
                      type="number"
                      className="input-modern"
                      value={config.sslConfig.attentionDays}
                      onChange={(e) => setConfig({
                        ...config,
                        sslConfig: {...config.sslConfig, attentionDays: parseInt(e.target.value)}
                      })}
                      min="30"
                      max="180"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      大于此天数的证书为"正常"状态
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">SSL证书状态说明</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="inline-block px-2 py-1 rounded text-xs bg-red-100 text-red-800 mb-2">已过期</span>
                    <p className="text-xs text-gray-600">证书已经过期</p>
                  </div>
                  <div>
                    <span className="inline-block px-2 py-1 rounded text-xs bg-red-100 text-red-800 mb-2">紧急</span>
                    <p className="text-xs text-gray-600">{config.sslConfig.criticalDays}天内到期</p>
                  </div>
                  <div>
                    <span className="inline-block px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800 mb-2">警告</span>
                    <p className="text-xs text-gray-600">{config.sslConfig.warningDays}天内到期</p>
                  </div>
                  <div>
                    <span className="inline-block px-2 py-1 rounded text-xs bg-green-100 text-green-800 mb-2">正常</span>
                    <p className="text-xs text-gray-600">大于{config.sslConfig.warningDays}天</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">定时任务说明</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">注意事项</p>
                      <p>定时任务的执行时间在系统部署时通过环境变量配置，无法在运行时修改。如需调整，请修改 .env 文件并重启系统。</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-blue-500" />
                        域名扫描任务
                      </h4>
                      <span className="text-sm text-gray-500">每天 04:30</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      自动使用 WHOIS 协议查询所有域名的真实到期时间，更新数据库中的信息。
                    </p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center">
                        <Shield className="w-4 h-4 mr-2 text-green-500" />
                        SSL证书扫描任务
                      </h4>
                      <span className="text-sm text-gray-500">每天 05:00</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      检测所有监控域名的SSL证书状态，包括有效期、颁发机构等信息。
                    </p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center">
                        <Bell className="w-4 h-4 mr-2 text-yellow-500" />
                        告警通知任务
                      </h4>
                      <span className="text-sm text-gray-500">每天 12:00</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      根据配置的告警规则，发送域名和SSL证书到期提醒到钉钉、企业微信等平台。
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Cron 表达式说明</h4>
                  <p className="text-sm text-gray-600 mb-2">系统使用标准的 Cron 表达式配置定时任务：</p>
                  <code className="block bg-white p-3 rounded text-xs border border-gray-200">
                    分钟 小时 日期 月份 星期<br/>
                    30   4    *    *    *  = 每天凌晨4:30<br/>
                    0    5    *    *    *  = 每天凌晨5:00<br/>
                    0    12   *    *    *  = 每天中午12:00
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 底部操作栏 */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            重置默认值
          </button>
          <button
            onClick={handleSave}
            className="btn-primary flex items-center gap-2"
            disabled={saving}
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
