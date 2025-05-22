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
