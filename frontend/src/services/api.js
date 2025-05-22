import axios from 'axios';
import { toast } from 'react-hot-toast'; // 用于显示错误通知

// 创建axios实例
const api = axios.create({
  // API基础URL，优先从环境变量读取，否则默认为 /api (由Nginx代理)
  baseURL: import.meta.env.VITE_API_URL || '/api', 
  headers: {
    'Content-Type': 'application/json',
    // 如果有认证，可以在这里添加默认的 Authorization 请求头
    // 'Authorization': `Bearer ${localStorage.getItem('token')}` 
  }
});

// 请求拦截器 (可选，用于添加token等)
// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('authToken'); // 示例：从localStorage获取token
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );


// 响应拦截器
api.interceptors.response.use(
  (response) => response, // 成功响应直接返回
  (error) => {
    // 处理错误响应
    let message = '发生错误，请稍后再试。'; // 默认错误消息
    if (error.response) {
      // 后端返回了错误信息
      message = error.response.data?.message || error.response.data?.error || message;
      if (error.response.status === 401) {
        // 示例：处理未授权错误，例如跳转到登录页
        // window.location.href = '/login';
        message = '未授权或会话已过期，请重新登录。';
      } else if (error.response.status === 403) {
        message = '您没有权限执行此操作。';
      } else if (error.response.status === 404) {
        message = '请求的资源未找到。';
      }
    } else if (error.request) {
      // 请求已发出，但没有收到响应 (例如网络错误)
      message = '网络错误，无法连接到服务器。';
    }
    // 其他类型的错误 (例如请求设置错误)
    // message = error.message;

    toast.error(message); // 使用react-hot-toast显示错误
    return Promise.reject(error); // 继续传递错误，以便组件可以单独处理
  }
);

// --- 域名API ---
export const domainAPI = {
  // 获取所有域名 (带分页、筛选、排序参数)
  getAll: (params) => api.get('/domains', { params }),
  
  // 获取单个域名详情
  getById: (id) => api.get(`/domains/${id}`),
  
  // 创建新域名
  create: (data) => api.post('/domains', data),
  
  // 更新指定ID的域名
  update: (id, data) => api.put(`/domains/${id}`, data),
  
  // 删除指定ID的域名
  delete: (id) => api.delete(`/domains/${id}`),
  
  // 导入CSV文件
  importCsv: (formData) => api.post('/domains/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data' // CSV导入需要此请求头
    }
  }),
  
  // 导出CSV文件
  exportCsv: () => api.get('/domains/export', {
    responseType: 'blob' // 响应类型为二进制大对象，用于文件下载
  }),
  
  // 评估指定ID域名的续费建议
  evaluateRenewal: (id) => api.post(`/domains/${id}/evaluate-renewal`),
  
  // 批量操作 (如批量删除、批量评估)
  batchOperation: (data) => api.post('/domains/batch', data)
};

// --- 仪表盘API ---
export const dashboardAPI = {
  // 获取仪表盘统计数据
  getStats: () => api.get('/dashboard/stats')
};

// --- 历史记录API ---
export const historyAPI = {
  // 获取历史记录 (带分页、筛选参数)
  getAll: (params) => api.get('/history', { params })
};

// --- 系统API ---
export const systemAPI = {
  // 手动触发检查所有域名到期情况
  checkExpiries: () => api.post('/system/check-expiries'),
  
  // 获取续费标准内容
  getRenewalStandards: () => api.get('/system/renewal-standards'),
  
  // 获取系统健康状态
  healthCheck: () => api.get('/system/health'),
  
  // 触发数据库备份
  backup: () => api.get('/system/backup') // 后端应返回备份结果或触发下载
};

export default api; // 默认导出axios实例，方便直接使用 api.get(...) 等
