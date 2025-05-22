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
