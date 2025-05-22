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
