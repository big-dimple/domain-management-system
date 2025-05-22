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
