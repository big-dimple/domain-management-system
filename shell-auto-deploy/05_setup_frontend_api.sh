#!/bin/bash

# 域名管理系统 - 前端API服务与状态管理脚本
# 此脚本负责创建API服务封装、Zustand状态管理相关的Store以及通用组件。

# 彩色输出函数
print_green() {
    echo -e "\e[32m$1\e[0m" # 绿色输出
}

print_yellow() {
    echo -e "\e[33m$1\e[0m" # 黄色输出
}

print_red() {
    echo -e "\e[31m$1\e[0m" # 红色输出
}

print_blue() {
    echo -e "\e[34m$1\e[0m" # 蓝色输出
}

# 读取配置
# PROJECT_DIR 将从此文件加载
if [ -f /tmp/domain-management-system/config ]; then
    source /tmp/domain-management-system/config
else
    print_red "错误：找不到配置文件 /tmp/domain-management-system/config。"
    print_red "请确保已先运行初始化脚本 (02_initialize_project.sh)。"
    exit 1
fi

# 检查 PROJECT_DIR 是否已设置
if [ -z "$PROJECT_DIR" ]; then
    print_red "错误：项目目录 (PROJECT_DIR) 未在配置文件中设置。"
    exit 1
fi

# 显示脚本信息
print_blue "========================================"
print_blue "    域名管理系统 - 前端API服务与状态管理脚本"
print_blue "========================================"
print_yellow "此脚本将创建以下文件:"
echo "1. API服务封装 (./frontend/src/services/api.js)"
echo "2. 状态管理 - Domain Store (./frontend/src/stores/domainStore.js)"
echo "3. 状态管理 - Dashboard Store (./frontend/src/stores/dashboardStore.js)"
echo "4. 状态管理 - History Store (./frontend/src/stores/historyStore.js)"
echo "5. 状态管理 - System Store (./frontend/src/stores/systemStore.js)"
echo "6. 通用组件 - MarkdownRenderer.jsx (./frontend/src/components/MarkdownRenderer.jsx)"

# 创建必要的目录
mkdir -p "$PROJECT_DIR/frontend/src/services"
mkdir -p "$PROJECT_DIR/frontend/src/stores"
mkdir -p "$PROJECT_DIR/frontend/src/components" # MarkdownRenderer 在 components 下

# 创建API服务文件 (api.js)
print_green "创建API服务封装 (./frontend/src/services/api.js)..."
cat > "$PROJECT_DIR/frontend/src/services/api.js" << 'EOF'
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
EOF

# 创建Domain Store (Zustand) - 修复分页结构适配
print_green "创建域名状态管理 (./frontend/src/stores/domainStore.js)..."
cat > "$PROJECT_DIR/frontend/src/stores/domainStore.js" << 'EOF'
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
EOF

# 创建Dashboard Store
print_green "创建仪表盘状态管理 (./frontend/src/stores/dashboardStore.js)..."
cat > "$PROJECT_DIR/frontend/src/stores/dashboardStore.js" << 'EOF'
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
EOF

# 创建History Store - 修复分页结构适配
print_green "创建历史记录状态管理 (./frontend/src/stores/historyStore.js)..."
cat > "$PROJECT_DIR/frontend/src/stores/historyStore.js" << 'EOF'
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
EOF

# 创建System Store
print_green "创建系统状态管理 (./frontend/src/stores/systemStore.js)..."
cat > "$PROJECT_DIR/frontend/src/stores/systemStore.js" << 'EOF'
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
EOF

# 创建通用组件 - MarkdownRenderer.jsx
print_green "创建通用Markdown渲染组件 (./frontend/src/components/MarkdownRenderer.jsx)..."
# 注意: 这个简单的实现仅将换行符转为 <br /> 或分段。
# 一个更完整的实现会使用像 'marked' 或 'react-markdown' 这样的库。
# Tailwind CSS 的 Typography 插件 (`@tailwindcss/typography`) 可以很好地配合这些库。
cat > "$PROJECT_DIR/frontend/src/components/MarkdownRenderer.jsx" << 'EOF'
import React from 'react';
// 如果需要更复杂的Markdown解析，可以引入:
// import { marked } from 'marked'; // 需要 npm install marked
// import DOMPurify from 'dompurify'; // 需要 npm install dompurify，用于XSS防护

export const MarkdownRenderer = ({ content }) => {
  if (!content) return null;
  
  // 简单实现: 将Markdown文本按段落和换行显示，并应用Tailwind Typography样式
  // 使用 Tailwind Typography 插件的 prose 类来美化HTML内容
  // 注意：这个实现不会解析复杂的Markdown语法，如标题、列表、代码块等。
  // 它主要依赖于后端返回的文本已经是某种结构化的（例如，通过换行符分隔）。
  
  // 若要使用 marked + DOMPurify (更推荐的完整实现):
  // 
  // useEffect(() => {
  //   marked.setOptions({
  //     gfm: true, // Enable GitHub Flavored Markdown
  //     breaks: true, // Treat newlines as <br>
  //   });
  // }, []);
  // 
  // const rawMarkup = marked.parse(content || '');
  // const cleanMarkup = DOMPurify.sanitize(rawMarkup);
  // return (
  //   <div 
  //     className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none" 
  //     dangerouslySetInnerHTML={{ __html: cleanMarkup }} 
  //   />
  // );
  
  // 当前采用简单的直接渲染方式，依赖后端文本格式和CSS
  // 确保后端返回的文本中的换行符 (\n) 被正确处理成HTML换行
  return (
    <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none whitespace-pre-wrap">
      {content}
    </div>
  );
};

export default MarkdownRenderer;
EOF

print_green "前端API服务、状态管理及通用组件创建完成！"
print_blue "========================================"
print_blue "         前端API与Store摘要"
print_blue "========================================"
echo "已创建: ./frontend/src/services/api.js"
echo "已创建: ./frontend/src/stores/domainStore.js (适配mongoose-paginate-v2)"
echo "已创建: ./frontend/src/stores/dashboardStore.js"
echo "已创建: ./frontend/src/stores/historyStore.js (适配mongoose-paginate-v2)"
echo "已创建: ./frontend/src/stores/systemStore.js"
echo "已创建: ./frontend/src/components/MarkdownRenderer.jsx"
print_yellow "继续执行前端基础布局组件脚本..."

exit 0
