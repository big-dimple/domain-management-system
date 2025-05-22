#!/bin/bash

# 域名管理系统 - 后端核心配置脚本
# 此脚本负责创建后端项目的 package.json, 主应用文件 (app.js), 数据库连接, 日志工具, 评估逻辑和中间件。

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
print_blue "    域名管理系统 - 后端核心配置脚本"
print_blue "========================================"
print_yellow "此脚本将创建以下后端核心文件:"
echo "1. package.json (后端依赖与脚本)"
echo "2. src/app.js (主应用入口与Express配置)"
echo "3. src/config/db.js (数据库连接与状态检查)"
echo "4. src/utils/logger.js (日志记录工具 - Winston)"
echo "5. src/utils/renewalEvaluator.js (域名续费评估逻辑)"
echo "6. src/middlewares/errorMiddleware.js (统一错误处理中间件)"

# 创建后端package.json
print_green "创建后端 package.json (./backend/package.json)..."
cat > "$PROJECT_DIR/backend/package.json" << 'EOF'
{
  "name": "domain-management-backend",
  "version": "1.0.0",
  "description": "域名管理系统后端API服务",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "csv-parser": "^3.0.0",
    "csv-stringify": "^6.4.0",
    "dayjs": "^1.11.8",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-async-handler": "^1.2.0",
    "express-rate-limit": "^6.8.0",
    "helmet": "^7.0.0",
    "jsonwebtoken": "^9.0.1",
    "mongoose": "^7.3.4",
    "mongoose-paginate-v2": "^1.7.4",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "sanitize-html": "^2.11.0",
    "winston": "^3.10.0",
    "winston-daily-rotate-file": "^4.7.1"
  },
  "devDependencies": {
    "jest": "^29.6.1",
    "nodemon": "^3.0.1",
    "supertest": "^6.3.3"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# 创建后端入口文件app.js
print_green "创建后端主应用文件 (./backend/src/app.js)..."
cat > "$PROJECT_DIR/backend/src/app.js" << 'EOF'
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
EOF

# 创建数据库配置 (db.js)
mkdir -p "$PROJECT_DIR/backend/src/config"
print_green "创建数据库配置文件 (./backend/src/config/db.js)..."
cat > "$PROJECT_DIR/backend/src/config/db.js" << 'EOF'
const mongoose = require('mongoose');
const logger = require('../utils/logger'); // 引入日志记录器

/**
 * 连接MongoDB数据库
 * @async
 * @returns {Promise<boolean>} 连接成功返回true, 否则返回false
 */
const connectDB = async () => {
  try {
    // Mongoose 6+ 默认使用 useNewUrlParser, useUnifiedTopology, useCreateIndex, useFindAndModify
    // 这些选项不再需要手动设置。
    const conn = await mongoose.connect(process.env.MONGODB_URI); // 从环境变量读取URI
    
    logger.info(`MongoDB连接成功: 主机 ${conn.connection.host}, 数据库 ${conn.connection.name}`);
    return true;
  } catch (error) {
    logger.error(`MongoDB连接失败: ${error.message}`, { stack: error.stack });
    // 初始连接失败时，可以选择退出进程或允许应用在无数据库连接的情况下启动（取决于应用需求）
    // process.exit(1); // 如果数据库是启动的硬依赖，则退出
    return false; // 返回false，允许应用层面处理
  }
};

/**
 * 检查当前MongoDB连接状态
 * @returns {{connected: boolean, state: number, stateString: string}} 连接状态对象
 */
const checkDBConnection = () => {
  const state = mongoose.connection.readyState;
  let stateString = '未知';
  switch (state) {
    case 0: stateString = '已断开 (disconnected)'; break;
    case 1: stateString = '已连接 (connected)'; break;
    case 2: stateString = '正在连接 (connecting)'; break;
    case 3: stateString = '正在断开 (disconnecting)'; break;
    case 99: stateString = '未初始化 (uninitialized)'; break; // Mongoose 5+
  }
  return {
    connected: state === 1,
    state: state,
    stateString: stateString
  };
};

/**
 * 获取数据库相关的统计信息 (示例)
 * @async
 * @returns {Promise<Object>} 包含统计信息的对象
 */
const getDBStats = async () => {
  try {
    if (mongoose.connection.readyState !== 1) { // 确保数据库已连接
      logger.warn('尝试获取DB统计信息，但数据库未连接。');
      return { domainsCount: 0, expiringCount: 0, historiesCount: 0, error: '数据库未连接' };
    }
    
    // 动态获取模型以避免循环依赖问题（如果模型文件也引用了db.js）
    // 通常 Domain 模型在 controller 中被引用。
    const Domain = mongoose.model('Domain'); // 假设 'Domain' 模型已注册
    const History = mongoose.model('History'); // 历史记录模型
    
    const domainsCount = await Domain.countDocuments();
    const historiesCount = await History.countDocuments();
    
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30天后
    
    const expiringCount = await Domain.countDocuments({
      expiryDate: { $gte: now, $lte: thirtyDaysLater }
    });
    
    return {
      domainsCount,
      expiringCount,
      historiesCount
    };
  } catch (error) {
    logger.error(`获取数据库统计信息失败: ${error.message}`, { stack: error.stack });
    return {
      domainsCount: 0,
      expiringCount: 0,
      historiesCount: 0,
      error: error.message
    };
  }
};

module.exports = {
  connectDB,
  checkDBConnection,
  getDBStats
};
EOF

# 创建日志工具 (logger.js)
mkdir -p "$PROJECT_DIR/backend/src/utils"
print_green "创建日志记录工具 (./backend/src/utils/logger.js)..."
cat > "$PROJECT_DIR/backend/src/utils/logger.js" << 'EOF'
const winston = require('winston');
const { format, transports } = winston;
require('winston-daily-rotate-file'); // 引入按日轮转插件

// 自定义日志格式
const customLogFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), // 时间戳格式
  format.errors({ stack: true }), // 记录错误堆栈
  format.splat(), // 支持 %s, %d 等占位符
  format.json(),  // 日志以JSON格式输出 (方便机器解析)
  format.printf(info => { // 自定义单行输出格式 (如果需要文本格式)
    // return `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}${info.stack ? '\n' + info.stack : ''}`;
    // 对于JSON格式，通常不需要 printf，但如果只用console输出，可以美化
    if (info.stack) {
        return `${info.timestamp} ${info.level}: ${info.message}\n${info.stack}`;
    }
    return `${info.timestamp} ${info.level}: ${info.message}`;
  })
);

// 控制台日志输出配置
const consoleTransport = new transports.Console({
  format: format.combine(
    format.colorize(), // 为日志级别添加颜色
    customLogFormat // 使用自定义格式 (如果选择printf，这里会生效)
    // 如果希望控制台也是JSON，则移除printf并确保json()在最后
  ),
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info' // 开发环境显示更多日志
});

// 文件日志输出配置 (按日轮转)
const dailyRotateFileTransport = new transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log', // 日志文件名格式
  datePattern: 'YYYY-MM-DD',             // 日期模式
  zippedArchive: true,                   // 归档旧日志时压缩
  maxSize: '20m',                        // 单个日志文件最大20MB
  maxFiles: '14d',                       // 最多保留14天的日志
  format: format.combine(                 // 文件日志不使用colorize
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json() // 文件日志推荐使用JSON格式
  )
});

// 错误日志专用文件 (按日轮转)
const errorDailyRotateFileTransport = new transports.DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  level: 'error', // 只记录 error 级别及以上的日志
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d', // 错误日志可以保留更长时间
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  )
});


// 创建Winston日志记录器实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // 从环境变量读取日志级别，默认为info
  format: customLogFormat, // 默认格式 (主要影响不带特定格式的transport)
  transports: [
    consoleTransport,
    dailyRotateFileTransport,
    errorDailyRotateFileTransport
  ],
  exitOnError: false // 发生未捕获异常时不退出进程 (由应用主逻辑处理)
});

// 为 morgan HTTP 日志添加一个 'http' 级别的方法 (如果需要区分)
// logger.http = (message) => logger.log('http', message);
// 或者直接让 morgan 使用 logger.info

module.exports = logger;
EOF

# 创建域名评估工具 (renewalEvaluator.js)
print_green "创建域名续费评估工具 (./backend/src/utils/renewalEvaluator.js)..."
cat > "$PROJECT_DIR/backend/src/utils/renewalEvaluator.js" << 'EOF'
// const dayjs = require('dayjs'); // 如果需要更复杂的日期比较，可以引入

/**
 * 根据域名信息评估续费建议。
 * 规则参考自 readme.md 中的描述。
 * @param {Object} domain 包含域名信息的对象。
 * Expected domain properties: isMarkedForNoRenewal, hasSpecialValue, businessUsage, icpStatus, domainType, domainName
 * @returns {{suggestion: string, reason: string}} 包含续费建议和原因的对象。
 */
const evaluateRenewal = (domain) => {
  // 规则 1: 如果域名被明确标记为不续费
  if (domain.isMarkedForNoRenewal === true) {
    return {
      suggestion: '不续费',
      reason: '域名已被明确标记为不续费。'
    };
  }
  
  // 规则 2: 如果域名被标记为具有特殊价值
  if (domain.hasSpecialValue === true) {
    return {
      suggestion: '建议续费',
      reason: '域名具有特殊价值，优先续费。'
    };
  }
  
  // 规则 3: 如果域名有实际业务使用
  const businessUsageLower = (domain.businessUsage || '').toLowerCase();
  if (businessUsageLower && 
      businessUsageLower !== '未使用' && 
      businessUsageLower !== '闲置' &&
      businessUsageLower !== '无' &&
      businessUsageLower !== 'n/a' &&
      businessUsageLower !== 'none') {
    return {
      suggestion: '建议续费',
      reason: `域名正在业务使用中 (${domain.businessUsage})。`
    };
  }
  
  // 规则 4: 如果域名有ICP证
  const icpStatusLower = (domain.icpStatus || '').toLowerCase();
  if (icpStatusLower && icpStatusLower !== '无' && icpStatusLower !== 'n/a' && icpStatusLower !== 'none') {
    return {
      suggestion: '建议续费',
      reason: `域名已办理ICP证 (${domain.icpStatus})。`
    };
  }
  
  // 规则 5 & 7: 未使用的 gTLD, New gTLD, 或非中国 ccTLD
  if (domain.domainType === 'gTLD' || domain.domainType === 'New gTLD' || 
      (domain.domainType === 'ccTLD' && !domain.domainName.toLowerCase().endsWith('.cn') && 
       !domain.domainName.toLowerCase().endsWith('.中国') && !domain.domainName.toLowerCase().endsWith('.xn--fiqs8s'))) {
    // 检查是否真的未使用 (基于上面 businessUsageLower 的判断)
    if (businessUsageLower === '未使用' || businessUsageLower === '闲置' || businessUsageLower === '无' || businessUsageLower === 'n/a' || businessUsageLower === 'none' || !businessUsageLower) {
      return {
        suggestion: '可不续费',
        reason: `${domain.domainType || '域名'} 未使用且无特殊标记。`
      };
    }
  }
  
  // 规则 6: 未使用的中国 ccTLD (.cn, .中国, .xn--fiqs8s)
  if (domain.domainType === 'ccTLD' && 
      (domain.domainName.toLowerCase().endsWith('.cn') || domain.domainName.toLowerCase().endsWith('.中国') || 
       domain.domainName.toLowerCase().endsWith('.xn--fiqs8s'))) {
    if (businessUsageLower === '未使用' || businessUsageLower === '闲置' || businessUsageLower === '无' || businessUsageLower === 'n/a' || businessUsageLower === 'none' || !businessUsageLower) {
      return {
        suggestion: '请示领导',
        reason: `中国域名 (${domain.domainName}) 未使用，建议请示决策。`
      };
    }
  }
  
  // 规则 8: 其他情况，默认为待评估
  return {
    suggestion: '待评估',
    reason: '当前信息不足或不符合明确规则，需人工评估。'
  };
};

module.exports = { evaluateRenewal };
EOF

# 创建中间件 (errorMiddleware.js)
mkdir -p "$PROJECT_DIR/backend/src/middlewares"
print_green "创建错误处理中间件 (./backend/src/middlewares/errorMiddleware.js)..."
cat > "$PROJECT_DIR/backend/src/middlewares/errorMiddleware.js" << 'EOF'
const logger = require('../utils/logger'); // 引入日志记录器

/**
 * Express 统一错误处理中间件。
 * 捕获路由处理函数中通过 next(error) 传递的错误，或Express自动捕获的错误。
 * @param {Error} err - 错误对象
 * @param {import('express').Request} req - Express请求对象
 * @param {import('express').Response} res - Express响应对象
 * @param {import('express').NextFunction} next - Express下一个中间件函数
 */
const errorHandler = (err, req, res, next) => {
  // 如果响应头已发送，则将错误委托给Express的默认错误处理器
  if (res.headersSent) {
    return next(err);
  }

  // 获取或设置错误状态码
  // 如果 err.statusCode 存在 (自定义错误)，则使用它；否则，如果 res.statusCode 不是200，则使用它；最后默认为500
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode) || 500;
  
  // 构建错误响应体
  const errorResponse = {
    status: 'error',
    message: err.message || '服务器内部错误，请稍后再试。', // 提供通用错误消息
    // (可选) 在开发环境下可以暴露更多错误细节
    ...(process.env.NODE_ENV !== 'production' && { 
      errorName: err.name, 
      stack: err.stack,
      details: err.details // 如果有自定义的错误详情
    }),
  };

  // 使用Winston记录错误详情
  logger.error(
    `${statusCode} - ${errorResponse.message} - URL: ${req.originalUrl} - 方法: ${req.method} - IP: ${req.ip}`, 
    { 
      errorName: err.name, 
      errorMessage: err.message,
      // stack: err.stack, // 堆栈信息可能很长，根据需要记录
      requestBody: req.body, // 小心记录敏感信息
      requestQuery: req.query,
    }
  );
  
  // 发送错误响应给客户端
  res.status(statusCode).json(errorResponse);
};

module.exports = { errorHandler };
EOF

print_green "后端核心配置文件创建完成！"
print_blue "========================================"
print_blue "           后端核心配置摘要"
print_blue "========================================"
echo "已创建: ./backend/package.json (已添加mongoose-paginate-v2依赖)"
echo "已创建: ./backend/src/app.js"
echo "已创建: ./backend/src/config/db.js (增强了统计信息获取)"
echo "已创建: ./backend/src/utils/logger.js"
echo "已创建: ./backend/src/utils/renewalEvaluator.js (增强了中国域名判断)"
echo "已创建: ./backend/src/middlewares/errorMiddleware.js"
print_yellow "继续执行后端模型与业务逻辑脚本..."

exit 0
