import React, { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

export const AlertConfigForm = ({ config, onSave, onCancel }) => {
  const [formData, setFormData] = useState(config || {
    type: 'dingtalk',
    name: '',
    webhook: '',
    enabled: true,
    alertTypes: ['both'],
    domainDaysBeforeExpiry: 30,
    sslDaysBeforeExpiry: 14
  });
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!formData.webhook) {
      toast.error('请先输入Webhook地址');
      return;
    }

    setTesting(true);
    try {
      const res = await axios.post('/api/alert-configs/test', {
        type: formData.type,
        webhook: formData.webhook
      });
      
      if (res.data.success) {
        toast.success('测试消息发送成功！');
      } else {
        toast.error(`测试失败：${res.data.message}`);
      }
    } catch (error) {
      toast.error('测试失败：' + (error.response?.data?.error || error.message));
    } finally {
      setTesting(false);
    }
  };

  const handleAlertTypeChange = (value) => {
    if (value === 'both') {
      setFormData({...formData, alertTypes: ['both']});
    } else {
      setFormData({...formData, alertTypes: [value]});
    }
  };

  // 获取Webhook配置提示信息
  const getWebhookTip = () => {
    switch (formData.type) {
      case 'dingtalk':
        return '钉钉群设置 → 智能群助手 → 添加机器人 → 自定义 → 获取Webhook';
      case 'wechat':
        return '企业微信群 → 群设置 → 群机器人 → 添加 → 获取Webhook';
      case 'feishu':
        return '飞书群聊 → 设置 → 群机器人 → 添加机器人 → 自定义机器人 → 获取Webhook';
      default:
        return '';
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-lg p-6">
        <h2 className="text-xl font-bold mb-4">
          {config ? '编辑告警配置' : '添加告警配置'}
        </h2>
        
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">告警类型</label>
              <select
                className="input-modern"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value="dingtalk">钉钉机器人</option>
                <option value="wechat">企业微信机器人</option>
                <option value="feishu">飞书机器人</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">配置名称</label>
              <input
                className="input-modern"
                placeholder="例如：运维组钉钉群"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Webhook地址</label>
              <input
                className="input-modern"
                placeholder="https://..."
                value={formData.webhook}
                onChange={(e) => setFormData({...formData, webhook: e.target.value})}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {getWebhookTip()}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">告警内容</label>
              <select
                className="input-modern"
                value={formData.alertTypes[0]}
                onChange={(e) => handleAlertTypeChange(e.target.value)}
              >
                <option value="both">域名 + SSL证书</option>
                <option value="domain">仅域名</option>
                <option value="ssl">仅SSL证书</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">域名提前告警天数</label>
                <input
                  type="number"
                  className="input-modern"
                  value={formData.domainDaysBeforeExpiry}
                  onChange={(e) => setFormData({...formData, domainDaysBeforeExpiry: parseInt(e.target.value)})}
                  min="1"
                  max="365"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">SSL提前告警天数</label>
                <input
                  type="number"
                  className="input-modern"
                  value={formData.sslDaysBeforeExpiry}
                  onChange={(e) => setFormData({...formData, sslDaysBeforeExpiry: parseInt(e.target.value)})}
                  min="1"
                  max="365"
                />
              </div>
            </div>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="rounded text-blue-500 focus:ring-blue-500"
                checked={formData.enabled}
                onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
              />
              <span>启用此告警配置</span>
            </label>
          </div>
          
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
            
            <div className="space-x-2">
              <button 
                type="button" 
                onClick={onCancel} 
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button 
                type="submit" 
                className="btn-primary"
              >
                保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
