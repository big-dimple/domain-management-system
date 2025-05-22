import { create } from 'zustand';
import { historyAPI } from '../services/api';

const useHistoryStore = create((set, get) => ({
  // --- 状态 (State) ---
  histories: [], // 历史记录列表
  loading: false,
  error: null,
  pagination: { // 分页信息 - 适配mongoose-paginate-v2结构
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  },
  filters: { // 筛选条件
    domainName: '', // 按域名名称筛选
    actionType: ''  // 按操作类型筛选
  },
  
  // --- 操作 (Actions) ---
  // 加载历史记录
  fetchHistories: async () => {
    set({ loading: true, error: null });
    try {
      const { filters, pagination } = get(); // 获取当前筛选和分页状态
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      const response = await historyAPI.getAll(params);
      
      // 适配mongoose-paginate-v2的返回结构
      set({
        histories: response.data.data, // docs -> data
        pagination: response.data.pagination, // 直接使用后端返回的pagination对象
        loading: false
      });
    } catch (error) {
      set({
        error: error.message,
        loading: false
      });
    }
  },
  
  // 设置筛选条件
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 } // 筛选变化时重置到第一页
    }));
    get().fetchHistories(); // 重新获取数据
  },
  
  // 重置筛选条件
  resetFilters: () => {
    set((state) => ({
      filters: {
        domainName: '',
        actionType: ''
      },
      pagination: { ...state.pagination, page: 1 }
    }));
    get().fetchHistories();
  },
  
  // 设置页码
  setPage: (page) => {
    set((state) => ({ pagination: { ...state.pagination, page } }));
    get().fetchHistories();
  }
}));

export default useHistoryStore;
