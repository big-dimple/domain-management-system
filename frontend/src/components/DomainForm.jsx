import React, { useState } from 'react';
import dayjs from 'dayjs';

export const DomainForm = ({ domain, onSave, onCancel }) => {
  const [formData, setFormData] = useState(domain || {
    domainName: '',
    domainType: 'gTLD',
    expiryDate: '',
    holder: '',
    businessUsage: '',
    hasICP: false,
    renewalPrice: '',
    notes: '',
    isMarkedForNoRenewal: false,
    hasSpecialValue: false
  });

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-2xl p-6">
        <h2 className="text-xl font-bold mb-4">{domain ? '编辑域名' : '添加域名'}</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">域名 *</label>
              <input
                className="input-modern"
                placeholder="example.com"
                value={formData.domainName}
                onChange={(e) => setFormData({...formData, domainName: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">域名类型</label>
              <select
                className="input-modern"
                value={formData.domainType}
                onChange={(e) => setFormData({...formData, domainType: e.target.value})}
              >
                <option value="gTLD">gTLD</option>
                <option value="ccTLD">ccTLD</option>
                <option value="New gTLD">New gTLD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">到期日期 *</label>
              <input
                type="date"
                className="input-modern"
                value={formData.expiryDate ? dayjs(formData.expiryDate).format('YYYY-MM-DD') : ''}
                onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">持有者</label>
              <input
                className="input-modern"
                placeholder="公司名称"
                value={formData.holder}
                onChange={(e) => setFormData({...formData, holder: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">业务使用情况</label>
              <input
                className="input-modern"
                placeholder="公司官网/API服务等"
                value={formData.businessUsage}
                onChange={(e) => setFormData({...formData, businessUsage: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ICP证</label>
              <select
                className="input-modern"
                value={formData.hasICP ? 'true' : 'false'}
                onChange={(e) => setFormData({...formData, hasICP: e.target.value === 'true'})}
              >
                <option value="false">否</option>
                <option value="true">是</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">续费价格</label>
              <input
                className="input-modern"
                placeholder="100元/年"
                value={formData.renewalPrice}
                onChange={(e) => setFormData({...formData, renewalPrice: e.target.value})}
              />
            </div>
            <div className="col-span-2">
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
                checked={formData.isMarkedForNoRenewal}
                onChange={(e) => setFormData({...formData, isMarkedForNoRenewal: e.target.checked})}
              />
              <span className="text-sm">标记为不续费</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="rounded text-blue-500 focus:ring-blue-500"
                checked={formData.hasSpecialValue}
                onChange={(e) => setFormData({...formData, hasSpecialValue: e.target.checked})}
              />
              <span className="text-sm">具有特殊价值</span>
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
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
