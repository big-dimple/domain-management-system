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
