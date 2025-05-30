const { SystemConfig } = require('./models');

// 获取配置（优先从数据库，否则从环境变量）
async function getSystemConfig() {
  try {
    let config = await SystemConfig.findOne({ name: 'default' });
    
    if (!config) {
      // 创建默认配置
      config = await SystemConfig.create({
        name: 'default',
        config: {
          general: {
            PORT: process.env.PORT || '3001',
            LOG_LEVEL: process.env.LOG_LEVEL || 'info',
            CSV_MAX_SIZE: process.env.CSV_MAX_SIZE || '50MB',
            CSV_ENCODING: process.env.CSV_ENCODING || 'utf-8'
          },
          scan: {
            SCAN_ENABLED: process.env.SCAN_ENABLED || 'true',
            SCAN_CRON: process.env.SCAN_CRON || '30 4 * * *',
            SCAN_TIMEOUT: process.env.SCAN_TIMEOUT || '30000',
            SCAN_BATCH_SIZE: process.env.SCAN_BATCH_SIZE || '10'
          },
          ssl: {
            SSL_SCAN_ENABLED: process.env.SSL_SCAN_ENABLED || 'true',
            SSL_SCAN_CRON: process.env.SSL_SCAN_CRON || '0 5 * * *',
            SSL_SCAN_TIMEOUT: process.env.SSL_SCAN_TIMEOUT || '20000',
            SSL_SCAN_BATCH_SIZE: process.env.SSL_SCAN_BATCH_SIZE || '5',
            SSL_CRITICAL_DAYS: process.env.SSL_CRITICAL_DAYS || '7',
            SSL_WARNING_DAYS: process.env.SSL_WARNING_DAYS || '30',
            SSL_ATTENTION_DAYS: process.env.SSL_ATTENTION_DAYS || '60'
          },
          alert: {
            ALERT_ENABLED: process.env.ALERT_ENABLED || 'true',
            ALERT_CRON: process.env.ALERT_CRON || '0 12 * * *'
          },
          advanced: {
            EVAL_URGENT_DAYS: process.env.EVAL_URGENT_DAYS || '7',
            EVAL_SUGGEST_DAYS: process.env.EVAL_SUGGEST_DAYS || '30',
            EVAL_ATTENTION_DAYS: process.env.EVAL_ATTENTION_DAYS || '90'
          }
        }
      });
    }
    
    return config.config;
  } catch (error) {
    console.error('获取系统配置失败:', error);
    // 返回环境变量配置作为后备
    return {
      general: {
        PORT: process.env.PORT || '3001',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        CSV_MAX_SIZE: process.env.CSV_MAX_SIZE || '50MB',
        CSV_ENCODING: process.env.CSV_ENCODING || 'utf-8'
      },
      scan: {
        SCAN_ENABLED: process.env.SCAN_ENABLED || 'true',
        SCAN_CRON: process.env.SCAN_CRON || '30 4 * * *',
        SCAN_TIMEOUT: process.env.SCAN_TIMEOUT || '30000',
        SCAN_BATCH_SIZE: process.env.SCAN_BATCH_SIZE || '10'
      },
      ssl: {
        SSL_SCAN_ENABLED: process.env.SSL_SCAN_ENABLED || 'true',
        SSL_SCAN_CRON: process.env.SSL_SCAN_CRON || '0 5 * * *',
        SSL_SCAN_TIMEOUT: process.env.SSL_SCAN_TIMEOUT || '20000',
        SSL_SCAN_BATCH_SIZE: process.env.SSL_SCAN_BATCH_SIZE || '5',
        SSL_CRITICAL_DAYS: process.env.SSL_CRITICAL_DAYS || '7',
        SSL_WARNING_DAYS: process.env.SSL_WARNING_DAYS || '30',
        SSL_ATTENTION_DAYS: process.env.SSL_ATTENTION_DAYS || '60'
      },
      alert: {
        ALERT_ENABLED: process.env.ALERT_ENABLED || 'true',
        ALERT_CRON: process.env.ALERT_CRON || '0 12 * * *'
      },
      advanced: {
        EVAL_URGENT_DAYS: process.env.EVAL_URGENT_DAYS || '7',
        EVAL_SUGGEST_DAYS: process.env.EVAL_SUGGEST_DAYS || '30',
        EVAL_ATTENTION_DAYS: process.env.EVAL_ATTENTION_DAYS || '90'
      }
    };
  }
}

// 保存配置到数据库
async function saveSystemConfig(newConfig) {
  try {
    const config = await SystemConfig.findOneAndUpdate(
      { name: 'default' },
      { 
        config: newConfig,
        updatedBy: 'admin'
      },
      { new: true, upsert: true }
    );
    
    return config.config;
  } catch (error) {
    throw new Error('保存配置失败: ' + error.message);
  }
}

// 获取特定配置值
async function getConfigValue(path) {
  const config = await getSystemConfig();
  const keys = path.split('.');
  let value = config;
  
  for (const key of keys) {
    value = value[key];
    if (value === undefined) break;
  }
  
  return value;
}

module.exports = {
  getSystemConfig,
  saveSystemConfig,
  getConfigValue
};
