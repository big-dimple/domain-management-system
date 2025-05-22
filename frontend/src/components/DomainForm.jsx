import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form'; // 引入 Controller 用于受控组件
import dayjs from 'dayjs';

const domainTypeOptions = [ { value: 'gTLD', label: 'gTLD' }, { value: 'ccTLD', label: 'ccTLD' }, { value: 'New gTLD', label: 'New gTLD' }];

export default function DomainForm({ domain, onSubmit, onCancel }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const isEditMode = Boolean(domain); // 判断是编辑模式还是新增模式

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, control, watch } = useForm({
    defaultValues: { // 表单默认值
      domainName: '',
      domainType: 'gTLD',
      renewalPriceRaw: '',
      expiryDate: '', // 将以 YYYY-MM-DD 格式存储
      holder: '',
      resolverAccount: '',
      resolverProvider: '',
      businessUsage: '',
      icpStatus: '',
      notes: '',
      isMarkedForNoRenewal: false,
      hasSpecialValue: false
    }
  });
  
  // 当 domain prop 变化时 (例如打开编辑弹窗)，用 domain 数据重置表单
  useEffect(() => {
    if (isEditMode && domain) {
      const formData = {
        ...domain,
        // 将日期转换为 YYYY-MM-DD 格式以适配 date input
        expiryDate: domain.expiryDate ? dayjs(domain.expiryDate).format('YYYY-MM-DD') : '',
      };
      reset(formData); // 使用 react-hook-form 的 reset 方法填充表单
    } else {
      // 新增模式或domain为空时，重置为默认值
      reset({
        domainName: '', domainType: 'gTLD', renewalPriceRaw: '', expiryDate: '',
        holder: '', resolverAccount: '', resolverProvider: '', businessUsage: '',
        icpStatus: '', notes: '', isMarkedForNoRenewal: false, hasSpecialValue: false
      });
    }
  }, [domain, isEditMode, reset]);
  
  const handleFormSubmit = (data) => {
    // 准备提交给后端的数据
    const submissionData = {
      ...data,
      // 将日期字符串转换回 Date 对象或 null
      expiryDate: data.expiryDate ? dayjs(data.expiryDate).toDate() : null,
      // 确保布尔值正确传递
      isMarkedForNoRenewal: Boolean(data.isMarkedForNoRenewal),
      hasSpecialValue: Boolean(data.hasSpecialValue),
    };
    onSubmit(submissionData); // 调用父组件传递的 onSubmit 函数
  };
  
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        {/* 域名 */}
        <div className="sm:col-span-3">
          <label htmlFor="domainName" className="block text-sm font-medium leading-6 text-gray-900">域名 *</label>
          <div className="mt-2">
            <input
              type="text"
              id="domainName"
              {...register('domainName', { 
                required: '域名不能为空',
                pattern: {
                  value: /^([a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
                  message: '请输入有效的域名格式 (例如: example.com)'
                }
              })}
              className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${errors.domainName ? 'ring-red-500' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
              placeholder="example.com"
            />
            {errors.domainName && <p className="mt-2 text-sm text-red-600">{errors.domainName.message}</p>}
          </div>
        </div>
        
        {/* 域名类型 */}
        <div className="sm:col-span-3">
          <label htmlFor="domainType" className="block text-sm font-medium leading-6 text-gray-900">域名类型 *</label>
          <div className="mt-2">
            <select
              id="domainType"
              {...register('domainType', { required: '请选择域名类型' })}
              className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${errors.domainType ? 'ring-red-500' : 'ring-gray-300'} focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
            >
              {domainTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {errors.domainType && <p className="mt-2 text-sm text-red-600">{errors.domainType.message}</p>}
          </div>
        </div>
        
        {/* 年续费价 */}
        <div className="sm:col-span-3">
          <label htmlFor="renewalPriceRaw" className="block text-sm font-medium leading-6 text-gray-900">年续费价</label>
          <div className="mt-2">
            <input type="text" id="renewalPriceRaw" {...register('renewalPriceRaw')} placeholder="例如: 39元, 11 USD"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
          </div>
        </div>
        
        {/* 到期日期 */}
        <div className="sm:col-span-3">
          <label htmlFor="expiryDate" className="block text-sm font-medium leading-6 text-gray-900">到期日期 *</label>
          <div className="mt-2">
            <input type="date" id="expiryDate" {...register('expiryDate', { required: '请选择到期日期' })}
              className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${errors.expiryDate ? 'ring-red-500' : 'ring-gray-300'} focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`} />
            {errors.expiryDate && <p className="mt-2 text-sm text-red-600">{errors.expiryDate.message}</p>}
          </div>
        </div>
        
        {/* 持有者 */}
        <div className="sm:col-span-3">
          <label htmlFor="holder" className="block text-sm font-medium leading-6 text-gray-900">持有者 (中文)</label>
          <div className="mt-2">
            <input type="text" id="holder" {...register('holder')}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
          </div>
        </div>
        
        {/* 业务使用情况 */}
        <div className="sm:col-span-3">
          <label htmlFor="businessUsage" className="block text-sm font-medium leading-6 text-gray-900">业务使用情况</label>
          <div className="mt-2">
            <input type="text" id="businessUsage" {...register('businessUsage')} placeholder="例如: 公司官网, 未使用"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
          </div>
        </div>
        
        {/* 解析管理账号 */}
        <div className="sm:col-span-3">
          <label htmlFor="resolverAccount" className="block text-sm font-medium leading-6 text-gray-900">解析管理账号</label>
          <div className="mt-2">
            <input type="text" id="resolverAccount" {...register('resolverAccount')}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
          </div>
        </div>
        
        {/* 解析管理方 */}
        <div className="sm:col-span-3">
          <label htmlFor="resolverProvider" className="block text-sm font-medium leading-6 text-gray-900">解析管理方</label>
          <div className="mt-2">
            <input type="text" id="resolverProvider" {...register('resolverProvider')} placeholder="例如: Cloudflare, DNSPod"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
          </div>
        </div>
        
        {/* ICP证 */}
        <div className="sm:col-span-3">
          <label htmlFor="icpStatus" className="block text-sm font-medium leading-6 text-gray-900">ICP证</label>
          <div className="mt-2">
            <input type="text" id="icpStatus" {...register('icpStatus')} placeholder="例如: 无, 京ICP备XXXXXXXX号"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
          </div>
        </div>
        
        {/* 高级选项切换按钮 */}
        <div className="sm:col-span-6">
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm font-semibold leading-6 text-indigo-600 hover:text-indigo-500">
            {showAdvanced ? '隐藏高级选项' : '显示高级选项'}
          </button>
        </div>
        
        {/* 高级选项区域 */}
        {showAdvanced && (
          <>
            <div className="sm:col-span-6">
              <label htmlFor="notes" className="block text-sm font-medium leading-6 text-gray-900">备注信息</label>
              <div className="mt-2">
                <textarea id="notes" rows={3} {...register('notes')}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
              </div>
            </div>
            
            <div className="sm:col-span-3 relative flex items-start">
              <div className="flex h-6 items-center">
                <input id="isMarkedForNoRenewal" type="checkbox" {...register('isMarkedForNoRenewal')}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
              </div>
              <div className="ml-3 text-sm leading-6">
                <label htmlFor="isMarkedForNoRenewal" className="font-medium text-gray-900">标记为不续费</label>
                <p className="text-xs text-gray-500">选中后，该域名将总被建议为"不续费"。</p>
              </div>
            </div>
            
            <div className="sm:col-span-3 relative flex items-start">
              <div className="flex h-6 items-center">
                <input id="hasSpecialValue" type="checkbox" {...register('hasSpecialValue')}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
              </div>
              <div className="ml-3 text-sm leading-6">
                <label htmlFor="hasSpecialValue" className="font-medium text-gray-900">具有特殊价值</label>
                <p className="text-xs text-gray-500">选中后，该域名将优先被建议续费。</p>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* 表单操作按钮 */}
      <div className="mt-8 flex justify-end space-x-3 border-t border-gray-200 pt-5">
        <button type="button" onClick={onCancel} disabled={isSubmitting}
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50">
          取消
        </button>
        <button type="submit" disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50">
          {isSubmitting ? '保存中...' : (isEditMode ? '保存更改' : '创建域名')}
        </button>
      </div>
    </form>
  );
}
