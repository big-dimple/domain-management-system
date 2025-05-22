require('dotenv').config(); // 尽早加载环境变量
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan'); // HTTP请求日志
const rateLimit = require('express-rate-limit'); // API限速
const { connectDB } = require('./config/db'); // 数据库连接函数
const { errorHandler } = require('./middlewares/errorMiddleware'); // 统一错误处理
const logger = require('./utils/logger'); // Winston日志记录器

// 导入路由模块
const domainRoutes = require('./routes/domainRoutes');
const historyRoutes = require('./routes/historyRoutes');
const systemRoutes = require('./routes/systemRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || 3001; // 从环境变量读取端口，默认为3001

// 连接MongoDB数据库
connectDB();

// --- 中间件配置 ---
// 启用CORS (允许所有来源，生产环境应配置具体来源)
app.use(cors({ origin: '*' })); // 示例：允许所有来源，实际应配置更严格的策略

// 设置安全相关的HTTP头部
app.use(helmet());

// 解析JSON格式的请求体
app.use(express.json({ limit: '10mb' })); // 限制请求体大小，例如10MB
// 解析URL编码的请求体
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP请求日志 (使用 morgan, 将日志输出到winston)
// 'combined' 是一种常见的日志格式
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { 
  stream: { write: message => logger.http(message.trim()) } 
}));

// API请求速率限制 (保护API免受滥用)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟窗口期
  max: 200, // 每个IP在窗口期内最多200次请求 (可根据需要调整)
  standardHeaders: true, // 返回 RateLimit-* 头部
  legacyHeaders: false, // 不返回 X-RateLimit-* 头部
  message: { status: 'error', message: '请求过于频繁，请稍后再试。' }
});
app.use('/api/', apiLimiter); // 应用于所有 /api/ 路径

// --- 路由配置 ---
app.use('/api/domains', domainRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 根路径健康检查 (可选)
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: '域名管理系统后端API服务运行中', 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

// 404错误处理：当没有路由匹配时
app.use((req, res, next) => {
  const error = new Error(`路由未找到 - ${req.originalUrl}`);
  res.status(404);
  next(error); // 将错误传递给统一错误处理中间件
});

// 统一错误处理中间件 (必须放在所有路由和中间件之后)
app.use(errorHandler);

// 启动服务器
const server = app.listen(PORT, () => {
  logger.info(`服务器以 ${process.env.NODE_ENV || 'development'}模式 运行在端口: ${PORT}`);
});

// --- 优雅关闭与异常处理 ---
// 处理未捕获的同步异常
process.on('uncaughtException', (error) => {
  logger.error(`未捕获的异常: ${error.message}`, { name: error.name, stack: error.stack });
  // 在生产环境中，通常需要优雅地关闭服务器并退出进程
  // 对于关键错误，可能需要立即退出以避免不可预测的行为
  // server.close(() => process.exit(1)); 
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', { reason, promiseDetails: promise });
  // 同样，生产环境应考虑优雅关闭
  // server.close(() => process.exit(1));
});

// 优雅关闭 (例如响应SIGINT, SIGTERM信号)
const gracefulShutdown = (signal) => {
  logger.info(`${signal} 信号接收，开始优雅关闭...`);
  server.close(() => {
    logger.info('HTTP服务器已关闭。');
    // 在这里可以添加关闭数据库连接等清理操作
    // mongoose.connection.close(false, () => {
    //   logger.info('MongoDB连接已关闭。');
    //   process.exit(0);
    // });
    process.exit(0); // 暂时直接退出
  });

  // 如果服务器在超时时间内没有关闭，则强制退出
  setTimeout(() => {
    logger.warn('强制关闭超时，服务器未能优雅关闭。');
    process.exit(1);
  }, 10000); // 10秒超时
};

process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Ctrl+C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // kill 命令

module.exports = app; // 导出app实例，可能用于测试
