const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const cron = require('node-cron');

// 导入路由
const domainRoutes = require('./routes/domains');
const historyRoutes = require('./routes/history');

// 导入域名检查服务
const domainChecker = require('./cron/domainChecker');

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();

// 设置中间件
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB连接成功'))
  .catch((err) => console.error('MongoDB连接失败:', err));

// IP白名单中间件
const ipWhitelistMiddleware = (req, res, next) => {
  const allowedIP = process.env.ALLOWED_IP;
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // 如果未设置白名单或客户端IP在白名单中
  if (!allowedIP || allowedIP === '*' || clientIP === allowedIP || 
      clientIP === '::1' || clientIP === '127.0.0.1' || // 本地开发
      clientIP.includes(allowedIP)) { // 部分匹配，如局域网IP前缀
    return next();
  }
  
  return res.status(403).json({ message: '访问被拒绝' });
};

// 使用IP白名单
app.use(ipWhitelistMiddleware);

// 注册路由
app.use('/api/domains', domainRoutes);
app.use('/api/history', historyRoutes);

// 处理生产环境静态文件
if (process.env.NODE_ENV === 'production') {
  // 设置静态文件目录
  app.use(express.static(path.join(__dirname, '../../frontend/build')));

  // 所有未匹配的路由返回前端应用
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
  });
}

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: '服务器错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 设置定时任务
// 每周一凌晨3点执行域名检查
cron.schedule('0 3 * * 1', async () => {
  console.log('执行定时域名检查任务...');
  try {
    await domainChecker.checkAllDomains();
    console.log('域名检查任务完成');
  } catch (error) {
    console.error('域名检查任务失败:', error);
  }
});

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`服务器运行在端口: ${PORT}`);
});
