import { create } from 'zustand'; // 引入Zustand的create函数
import { domainAPI } from '../services/api'; // 引入封装好的API服务
import { toast } from 'react-hot-toast'; // 用于操作成功/失败的提示
import dayjs from 'dayjs';

// 使用Zustand创建domainStore
const useDomainStore = create((set, get) => ({
  // --- 状态 (State) ---
  domains: [], // 域名列表
  loading: false, // 是否正在加载数据
  error: null, // API请求错误信息
  pagination: { // 分页信息 - 适配mongoose-paginate-v2结构
    total: 0,      // 总记录数
    page: 1,       // 当前页码
    limit: 20,     // 每页条数
    totalPages: 0, // 总页数
    hasNextPage: false, // 是否有下一页
    hasPrevPage: false  // 是否有上一页
  },
  filters: { // 筛选条件
    search: '',
    domainType: '',
    holder: '',
    businessUsage: '',
    icpStatus: '',
    renewalSuggestion: '',
    expiringDays: '' // 例如 '30', '60', '90' 天内到期
  },
  sort: { // 排序条件
    field: 'domainName', // 默认排序字段
    order: 'asc'         // 默认排序顺序 (asc, desc)
  },
  
  // --- 操作 (Actions) ---
  
  // 加载域名列表
  fetchDomains: async () => {
    set({ loading: true, error: null }); // 开始加载，清除错误
    try {
      const { filters, pagination, sort } = get(); // 获取当前筛选、分页、排序状态
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort: sort.field,
        order: sort.order,
        ...filters // 合并所有筛选条件
      };
      
      const response = await domainAPI.getAll(params); // 调用API
      
      // 适配mongoose-paginate-v2的返回结构
      set({
        domains: response.data.data, // docs -> data
        pagination: response.data.pagination, // 直接使用后端返回的pagination对象
        loading: false
      });
    } catch (error) {
      set({
        error: error.message, // API拦截器已处理toast，这里只记录错误信息
        loading: false
      });
    }
  },
  
  // 设置筛选条件 (会触发重新加载数据)
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 } // 筛选变化时，重置到第一页
    }));
    get().fetchDomains(); // 重新获取数据
  },
  
  // 重置筛选条件 (会触发重新加载数据)
  resetFilters: () => {
    set((state) => ({
      filters: { // 恢复到初始筛选状态
        search: '',
        domainType: '',
        holder: '',
        businessUsage: '',
        icpStatus: '',
        renewalSuggestion: '',
        expiringDays: ''
      },
      pagination: { ...state.pagination, page: 1 } // 重置到第一页
    }));
    get().fetchDomains(); // 重新获取数据
  },
  
  // 设置排序条件 (会触发重新加载数据)
  setSort: (field, order) => {
    set({ sort: { field, order } });
    get().fetchDomains(); // 重新获取数据
  },
  
  // 设置当前页码 (会触发重新加载数据)
  setPage: (page) => {
    set((state) => ({ pagination: { ...state.pagination, page } }));
    get().fetchDomains(); // 重新获取数据
  },
  
  // 设置每页显示条数 (会触发重新加载数据)
  setLimit: (limit) => {
    set((state) => ({
      pagination: { ...state.pagination, page: 1, limit } // 修改每页条数时，重置到第一页
    }));
    get().fetchDomains(); // 重新获取数据
  },
  
  // 创建域名
  createDomain: async (data) => {
    set({ loading: true, error: null });
    try {
      await domainAPI.create(data);
      toast.success('域名创建成功！');
      await get().fetchDomains(); // 成功后刷新列表
      return { success: true };
    } catch (error) {
      // API拦截器已处理toast，这里仅返回失败状态
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // 更新域名
  updateDomain: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await domainAPI.update(id, data);
      toast.success('域名更新成功！');
      await get().fetchDomains(); // 成功后刷新列表
      return { success: true };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // 删除域名
  deleteDomain: async (id) => {
    set({ loading: true, error: null });
    try {
      await domainAPI.delete(id);
      toast.success('域名删除成功！');
      await get().fetchDomains(); // 成功后刷新列表
      return { success: true };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // 评估续费建议
  evaluateRenewal: async (id) => {
    set({ loading: true, error: null });
    try {
      await domainAPI.evaluateRenewal(id);
      toast.success('续费建议评估完成！');
      await get().fetchDomains(); // 成功后刷新列表
      return { success: true };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // 批量操作
  batchOperation: async (operation, ids, data) => {
    set({ loading: true, error: null });
    try {
      await domainAPI.batchOperation({ operation, ids, data });
      toast.success('批量操作成功！');
      await get().fetchDomains(); // 成功后刷新列表
      return { success: true };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // 导入CSV
  importCsv: async (file) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('csvFile', file); // 'csvFile' 需与后端 multer 配置的字段名一致
      
      const response = await domainAPI.importCsv(formData);
      
      // 显示详细的导入结果
      const result = response.data.data;
      if (result.total > 0) {
        toast.success(`CSV导入完成！新增 ${result.success} 个，更新 ${result.updated} 个，失败 ${result.failed} 个。`);
      }
      
      await get().fetchDomains(); // 成功后刷新列表
      return { success: true, data: result }; // 返回后端处理结果
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message, data: error.response?.data?.data };
    }
  },
  
  // 导出CSV
  exportCsv: async () => {
    set({ loading: true, error: null });
    try {
      const response = await domainAPI.exportCsv();
      
      // 使用浏览器下载功能处理CSV文件
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const filename = `域名管理系统导出_${dayjs().format('YYYYMMDD_HHmmss')}.csv`;
      
      // 触发下载 (需要浏览器环境)
      if (typeof window !== 'undefined' && window.navigator.msSaveOrOpenBlob) {
        // IE11
        window.navigator.msSaveOrOpenBlob(blob, filename);
      } else {
        // 其他浏览器
        const link = document.createElement('a');
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', filename);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }
      
      toast.success('CSV文件导出成功！');
      set({ loading: false });
      return { success: true };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  }
}));

export default useDomainStore;
