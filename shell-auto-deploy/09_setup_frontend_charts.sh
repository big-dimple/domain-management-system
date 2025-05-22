#!/bin/bash

# 域名管理系统 - 前端可视化图表组件脚本
# 此脚本负责创建仪表盘页面使用的图表和卡片组件。

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
print_blue "   域名管理系统 - 前端可视化图表组件脚本"
print_blue "========================================"
print_yellow "此脚本将创建以下可视化组件 (位于 ./frontend/src/components/Dashboard/):"
echo "1. DomainTypeChart.jsx - 域名类型分布图表 (饼图)"
echo "2. RenewalSuggestionChart.jsx - 续费建议分布图表 (环形图)"
echo "3. ExpiryTrendChart.jsx - 域名到期趋势图表 (柱状图)"
echo "4. UrgentDomainsCard.jsx - 紧急关注域名卡片"

# 创建Dashboard组件目录 (如果不存在)
mkdir -p "$PROJECT_DIR/frontend/src/components/Dashboard"

# 创建DomainTypeChart.jsx
print_green "创建域名类型分布图表 (./frontend/src/components/Dashboard/DomainTypeChart.jsx)..."
cat > "$PROJECT_DIR/frontend/src/components/Dashboard/DomainTypeChart.jsx" << 'EOF'
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'; // 引入Title

ChartJS.register(ArcElement, Tooltip, Legend, Title); // 注册Title

export default function DomainTypeChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow h-80 flex items-center justify-center">
        <p className="text-gray-500 text-sm">无域名类型数据可供显示</p>
      </div>
    );
  }
  
  const chartData = {
    labels: data.map(item => item.type || '未知类型'), // 处理可能的null或undefined type
    datasets: [
      {
        label: '域名数量',
        data: data.map(item => item.count),
        backgroundColor: [ // 提供一组美观的颜色
          'rgba(54, 162, 235, 0.8)',  // 蓝色
          'rgba(255, 99, 132, 0.8)',  // 红色
          'rgba(255, 206, 86, 0.8)', // 黄色
          'rgba(75, 192, 192, 0.8)',  // 青色
          'rgba(153, 102, 255, 0.8)',// 紫色
          'rgba(255, 159, 64, 0.8)'  // 橙色
        ],
        borderColor: [ // 边框颜色可以与背景色一致或稍深
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1
      }
    ]
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false, // 允许图表填充容器高度
    plugins: {
      legend: {
        position: 'bottom', // 图例位置
        labels: {
          padding: 15, // 图例标签间距
          boxWidth: 12,
          font: { size: 12 }
        }
      },
      title: {
        display: true,
        text: '域名类型分布', // 图表标题
        font: { size: 16, weight: 'bold' },
        padding: { top: 10, bottom: 20 }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += context.parsed + '个';
            }
            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
            const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) + '%' : '0%';
            label += ` (${percentage})`;
            return label;
          }
        }
      }
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow h-80"> {/* 固定高度 */}
      <Pie data={chartData} options={options} />
    </div>
  );
}
EOF

# 创建RenewalSuggestionChart.jsx
print_green "创建续费建议分布图表 (./frontend/src/components/Dashboard/RenewalSuggestionChart.jsx)..."
cat > "$PROJECT_DIR/frontend/src/components/Dashboard/RenewalSuggestionChart.jsx" << 'EOF'
import { Doughnut } from 'react-chartjs-2'; // 使用环形图
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

export default function RenewalSuggestionChart({ data }) {
  if (!data || data.length === 0) {
     return (
      <div className="bg-white p-6 rounded-lg shadow h-80 flex items-center justify-center">
        <p className="text-gray-500 text-sm">无续费建议数据可供显示</p>
      </div>
    );
  }
  
  const chartData = {
    labels: data.map(item => item.suggestion || '未知建议'),
    datasets: [
      {
        label: '域名数量',
        data: data.map(item => item.count),
        backgroundColor: [ // 针对常见建议类型定义颜色
          'rgba(75, 192, 192, 0.8)',  // 建议续费 (青色)
          'rgba(255, 159, 64, 0.8)', // 可不续费 (橙色)
          'rgba(255, 206, 86, 0.8)', // 请示领导 (黄色)
          'rgba(201, 203, 207, 0.8)', // 待评估 (灰色)
          'rgba(255, 99, 132, 0.8)',  // 不续费 (红色)
          'rgba(153, 102, 255, 0.8)'  // 其他 (紫色)
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(201, 203, 207, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 1
      }
    ]
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 15, boxWidth: 12, font: { size: 12 }}
      },
      title: {
        display: true,
        text: '域名续费建议分布',
        font: { size: 16, weight: 'bold' },
        padding: { top: 10, bottom: 20 }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            // 与饼图相同的 tooltip 格式化
            let label = context.label || '';
            if (label) label += ': ';
            if (context.parsed !== null) label += context.parsed + '个';
            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
            const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) + '%' : '0%';
            label += ` (${percentage})`;
            return label;
          }
        }
      }
    },
    cutout: '50%' // 环形图的中心孔洞大小
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow h-80">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
EOF

# 创建ExpiryTrendChart.jsx
print_green "创建域名到期趋势图表 (./frontend/src/components/Dashboard/ExpiryTrendChart.jsx)..."
cat > "$PROJECT_DIR/frontend/src/components/Dashboard/ExpiryTrendChart.jsx" << 'EOF'
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, // X轴
  LinearScale,   // Y轴
  BarElement,    // 柱状图元素
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ExpiryTrendChart({ data }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow h-80 flex items-center justify-center">
        <p className="text-gray-500 text-sm">无域名到期趋势数据可供显示</p>
      </div>
    );
  }
  
  // 确保标签顺序是我们期望的
  const orderedLabels = ['30天内', '60天内', '90天内', '180天内', '一年内', '一年以上'];
  const labels = orderedLabels.filter(label => data[label] !== undefined); // 只显示有数据的标签
  const values = labels.map(label => data[label]);
  
  const chartData = {
    labels,
    datasets: [
      {
        label: '即将到期域名数量',
        data: values,
        backgroundColor: 'rgba(54, 162, 235, 0.7)', // 蓝色柱子
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        borderRadius: 4, // 轻微圆角
        barPercentage: 0.6, // 柱子宽度占比
        categoryPercentage: 0.7 // 分类宽度占比
      }
    ]
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // 可以隐藏图例，因为只有一个数据集
        // position: 'top', 
      },
      title: {
        display: true,
        text: '域名到期趋势',
        font: { size: 16, weight: 'bold' },
        padding: { top: 10, bottom: 20 }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `数量: ${context.parsed.y}个`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true, // Y轴从0开始
        ticks: {
          precision: 0, // Y轴刻度为整数
          stepSize: Math.max(1, Math.ceil(Math.max(...values) / 5)) // 动态步长，最多5个主要刻度
        },
        grid: {
          // drawBorder: false, // 不绘制Y轴边框线
          // color: 'rgba(200, 200, 200, 0.2)', // 网格线颜色
        }
      },
      x: {
        grid: {
          display: false // 不显示X轴网格线
        }
      }
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow h-80">
      <Bar data={chartData} options={options} />
    </div>
  );
}
EOF

# 创建UrgentDomainsCard.jsx - 修复图标导入问题
print_green "创建紧急关注域名卡片 (./frontend/src/components/Dashboard/UrgentDomainsCard.jsx)..."
cat > "$PROJECT_DIR/frontend/src/components/Dashboard/UrgentDomainsCard.jsx" << 'EOF'
import { CalendarDaysIcon, ExclamationTriangleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'; // 更新图标
import dayjs from 'dayjs';
import { Link } from 'react-router-dom'; // 用于链接到域名详情

export default function UrgentDomainsCard({ domains }) {
  if (!domains || domains.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow h-full min-h-[20rem] flex flex-col items-center justify-center">
        <ShieldCheckIcon className="h-12 w-12 text-green-500 mb-3" /> {/* 使用Heroicons的图标 */}
        <p className="text-gray-600 text-md font-medium">太棒了！</p>
        <p className="text-gray-500 text-sm">当前没有需要紧急关注的域名。</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow h-full min-h-[20rem] flex flex-col">
      <div className="flex items-center mb-4">
        <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">紧急关注的域名</h3>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        以下是30天内到期且系统建议续费的域名，请及时处理。
      </p>
      
      <div className="flex-grow overflow-y-auto -mr-2 pr-2"> {/* 添加内边距和负外边距以美化滚动条 */}
        <ul role="list" className="divide-y divide-gray-200">
          {domains.map((domain) => (
            <li key={domain._id} className="py-3 hover:bg-gray-50 px-1 -mx-1 rounded">
              <Link to={`/domains?search=${domain.domainName}`} className="block"> {/* 假设可以搜索跳转 */}
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-indigo-600 truncate hover:text-indigo-800" title={domain.domainName}>
                      {domain.domainName}
                    </p>
                    <p className="text-xs text-gray-500 truncate" title={domain.holder}>
                      持有者: {domain.holder || 'N/A'}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex flex-col items-end">
                    <div className="flex items-center text-sm text-red-600">
                      <CalendarDaysIcon className="flex-shrink-0 mr-1 h-4 w-4 text-red-500" />
                      <p>
                        {dayjs(domain.expiryDate).format('YYYY/MM/DD')}
                      </p>
                    </div>
                    <p className="text-xs text-red-500 font-medium">
                       ({dayjs(domain.expiryDate).diff(dayjs(), 'day')}天后到期)
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
EOF

print_green "前端可视化图表组件创建完成！"
print_blue "========================================"
print_blue "         前端可视化图表组件摘要"
print_blue "========================================"
echo "已创建: ./frontend/src/components/Dashboard/DomainTypeChart.jsx"
echo "已创建: ./frontend/src/components/Dashboard/RenewalSuggestionChart.jsx"
echo "已创建: ./frontend/src/components/Dashboard/ExpiryTrendChart.jsx"
echo "已创建: ./frontend/src/components/Dashboard/UrgentDomainsCard.jsx (修复了图标导入问题)"
print_yellow "继续执行后端核心配置脚本..."

exit 0
