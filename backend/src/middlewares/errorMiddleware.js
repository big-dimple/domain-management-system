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
