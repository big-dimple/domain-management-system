import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export const EvaluationConfigForm = ({ onClose }) => {
  const [config, setConfig] = useState({
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
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('domain');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await axios.get('/api/evaluation/config');
      setConfig(res.data);
    } catch (error) {
      console.error('获取评估配置失败:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.put('/api/evaluation/config', config);
      toast.success('评估配置已更新');
      onClose();
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-2xl p-6">
        <h2 className="text-xl font-bold mb-4">评估配置</h2>
        
        {/* 标签页 */}
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
        </div>
        
        <div className="p-6">
          {activeTab === 'domain' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  紧急续费天数
                  <span className="text-gray-500 ml-2">(域名即将到期，需立即处理)</span>
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
                <p className="text-xs text-gray-500 mt-1">
                  少于此天数的有价值域名将标记为"紧急续费"
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  建议续费天数
                  <span className="text-gray-500 ml-2">(需要尽快安排续费)</span>
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
                <p className="text-xs text-gray-500 mt-1">
                  少于此天数的有价值域名将标记为"建议续费"
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  保持续费天数
                  <span className="text-gray-500 ml-2">(时间充裕，保持关注)</span>
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
                <p className="text-xs text-gray-500 mt-1">
                  少于此天数的有价值域名将标记为"保持续费"
                </p>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded">
                <h3 className="font-medium mb-2">域名评估逻辑说明：</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <span className="text-red-600">紧急续费</span>：{config.domainConfig.urgentDays}天内到期 + 有价值</li>
                  <li>• <span className="text-green-600">建议续费</span>：{config.domainConfig.urgentDays}-{config.domainConfig.suggestDays}天内到期 + 有价值</li>
                  <li>• <span className="text-blue-600">保持续费</span>：{config.domainConfig.suggestDays}-{config.domainConfig.attentionDays}天内到期 + 有价值</li>
                  <li>• <span className="text-yellow-600">请示领导</span>：{config.domainConfig.suggestDays}天内到期 + 价值不明</li>
                  <li>• <span className="text-gray-600">待评估</span>：时间充裕或价值不明</li>
                </ul>
              </div>
            </div>
          )}
          
          {activeTab === 'ssl' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  紧急处理天数
                  <span className="text-gray-500 ml-2">(SSL证书即将过期)</span>
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
                <p className="text-xs text-gray-500 mt-1">
                  少于此天数的证书将标记为"紧急"状态
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  警告天数
                  <span className="text-gray-500 ml-2">(需要关注)</span>
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
                <p className="text-xs text-gray-500 mt-1">
                  少于此天数的证书将标记为"警告"状态
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  关注天数
                  <span className="text-gray-500 ml-2">(正常关注范围)</span>
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
                <p className="text-xs text-gray-500 mt-1">
                  大于此天数的证书为"正常"状态
                </p>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded">
                <h3 className="font-medium mb-2">SSL证书状态说明：</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <span className="text-red-600">已过期</span>：证书已经过期</li>
                  <li>• <span className="text-red-600">紧急</span>：{config.sslConfig.criticalDays}天内到期</li>
                  <li>• <span className="text-yellow-600">警告</span>：{config.sslConfig.criticalDays}-{config.sslConfig.warningDays}天内到期</li>
                  <li>• <span className="text-green-600">正常</span>：大于{config.sslConfig.warningDays}天</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-2 mt-6 border-t pt-4">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
};
