import { create } from 'zustand';
import { dashboardAPI } from '../services/api';

const useDashboardStore = create((set) => ({
  // --- 状态 (State) ---
  stats: null, // 仪表盘统计数据
  loading: false,
  error: null,
  
  // --- 操作 (Actions) ---
  // 加载仪表盘数据
  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const response = await dashboardAPI.getStats();
      set({
        stats: response.data.data,
        loading: false
      });
    } catch (error) {
      set({
        error: error.message,
        loading: false
      });
    }
  }
}));

export default useDashboardStore;
