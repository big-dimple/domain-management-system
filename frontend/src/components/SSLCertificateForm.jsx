import React, { useState } from 'react';
import dayjs from 'dayjs';

export const SSLCertificateForm = ({ certificate, onSave, onCancel }) => {
  const [formData, setFormData] = useState(certificate || {
    domain: '',
    provider: '',
    cost: '',
    autoRenew: false,
    notes: ''
  });

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-lg p-6">
        <h2 className="text-xl font-bold mb-4">{certificate ? '编辑SSL证书' : '添加SSL证书'}</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">域名 *</label>
              <input
                className="input-modern"
                placeholder="example.com"
                value={formData.domain}
                onChange={(e) => setFormData({...formData, domain: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">证书提供商</label>
              <input
                className="input-modern"
                placeholder="Let's Encrypt / DigiCert 等"
                value={formData.provider}
                onChange={(e) => setFormData({...formData, provider: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">年费</label>
              <input
                className="input-modern"
                placeholder="0元/年"
                value={formData.cost}
                onChange={(e) => setFormData({...formData, cost: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                className="input-modern"
                placeholder="其他需要说明的信息"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="rounded text-blue-500 focus:ring-blue-500"
                checked={formData.autoRenew}
                onChange={(e) => setFormData({...formData, autoRenew: e.target.checked})}
              />
              <span className="text-sm">自动续期</span>
            </label>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
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
              {certificate ? '保存' : '添加并扫描'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
