import { create } from 'zustand';
import { systemAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const useSystemStore = create((set) => ({
  // --- 状态 (State) ---
  renewalStandards: null, // 续费标准内容
  healthStatus: null,     // 系统健康状态
  backupStatus: null,     // 最近备份状态
  loading: false,
  error: null,
  
  // --- 操作 (Actions) ---
  // 获取续费标准
  fetchRenewalStandards: async () => {
    set({ loading: true, error: null });
    try {
      const response = await systemAPI.getRenewalStandards();
      set({
        renewalStandards: response.data.data,
        loading: false
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  
  // 健康检查
  checkHealth: async () => {
    set({ loading: true, error: null }); // 可以考虑为不同操作设置不同的loading状态
    try {
      const response = await systemAPI.healthCheck();
      set({
        healthStatus: response.data.data,
        loading: false
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  
  // 检查域名到期 (手动触发)
  checkExpiries: async () => {
    set({ loading: true, error: null });
    try {
      const response = await systemAPI.checkExpiries();
      toast.success('域名到期检查完成！');
      set({ loading: false });
      return { success: true, data: response.data.data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // 备份数据库
  backupDatabase: async () => {
    set({ loading: true, error: null });
    try {
      const response = await systemAPI.backup();
      toast.success('数据库备份请求成功！'); // 后端可能异步处理，这里表示请求已发送
      set({
        backupStatus: response.data.data, // 更新备份状态信息
        loading: false
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  }
}));

export default useSystemStore;
