require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const routes = require('./routes');
const { logScan } = require('./domainScanner');
const { logSSL } = require('./sslChecker');
const { logAlert, checkAndSendAlerts } = require('./alertService');

const app = express();

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json());

// MongoDB连接
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB连接成功'))
  .catch(err => console.error('MongoDB连接失败:', err));

// 路由
app.use('/api', routes);

// 导入批量扫描函数
const { batchScanDomains, batchScanSSLCertificates } = require('./routes');

// 定时任务设置 - 域名扫描
if (process.env.SCAN_ENABLED === 'true') {
  const cronExpression = process.env.SCAN_CRON || '30 4 * * *';
  
  cron.schedule(cronExpression, async () => {
    logScan('开始执行定时域名扫描任务');
    
    try {
      const { ScanTask } = require('./models');
      
      const taskId = `domain_scheduled_${Date.now()}`;
      const task = new ScanTask({
        taskId,
        taskType: 'domain',
        triggeredBy: 'scheduled'
      });
      await task.save();
      
      logScan(`定时域名扫描任务已创建，任务ID: ${taskId}`);
      
      // 立即调用扫描函数
      setImmediate(() => {
        batchScanDomains(taskId).catch(error => {
          logScan(`定时域名扫描任务失败: ${error.message}`, 'error');
        });
      });
      
    } catch (error) {
      logScan(`创建定时域名扫描任务失败: ${error.message}`, 'error');
    }
  });
  
  console.log(`域名扫描定时任务已启用，执行时间: ${cronExpression}`);
}

// 定时任务设置 - SSL证书扫描
if (process.env.SSL_SCAN_ENABLED === 'true') {
  const sslCronExpression = process.env.SSL_SCAN_CRON || '0 5 * * *';
  
  cron.schedule(sslCronExpression, async () => {
    logSSL('开始执行定时SSL证书扫描任务');
    
    try {
      const { ScanTask } = require('./models');
      
      const taskId = `ssl_scheduled_${Date.now()}`;
      const task = new ScanTask({
        taskId,
        taskType: 'ssl',
        triggeredBy: 'scheduled'
      });
      await task.save();
      
      logSSL(`定时SSL证书扫描任务已创建，任务ID: ${taskId}`);
      
      // 立即调用扫描函数
      setImmediate(() => {
        batchScanSSLCertificates(taskId).catch(error => {
          logSSL(`定时SSL证书扫描任务失败: ${error.message}`, 'error');
        });
      });
      
    } catch (error) {
      logSSL(`创建定时SSL证书扫描任务失败: ${error.message}`, 'error');
    }
  });
  
  console.log(`SSL证书扫描定时任务已启用，执行时间: ${sslCronExpression}`);
}

// 告警定时任务设置
if (process.env.ALERT_ENABLED === 'true') {
  const alertCron = process.env.ALERT_CRON || '0 12 * * *';
  
  cron.schedule(alertCron, async () => {
    logAlert('开始执行定时告警任务');
    
    try {
      await checkAndSendAlerts();
      logAlert('定时告警任务执行完成');
    } catch (error) {
      logAlert(`定时告警任务失败: ${error.message}`, 'error');
    }
  });
  
  console.log(`告警定时任务已启用，执行时间: ${alertCron}`);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n域名管理系统 v3.0 后端服务启动成功`);
  console.log(`运行端口: ${PORT}`);
  console.log(`时区: ${process.env.TZ || 'Asia/Shanghai'}`);
  console.log(`当前时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log(`\n功能状态:`);
  console.log(`- 域名扫描: ${process.env.SCAN_ENABLED === 'true' ? '已启用' : '已禁用'}`);
  console.log(`- SSL证书扫描: ${process.env.SSL_SCAN_ENABLED === 'true' ? '已启用' : '已禁用'}`);
  console.log(`- 告警功能: ${process.env.ALERT_ENABLED === 'true' ? '已启用' : '已禁用'}`);
  
  if (process.env.SCAN_ENABLED === 'true') {
    console.log(`\n定时任务:`);
    console.log(`- 域名扫描: ${process.env.SCAN_CRON || '30 4 * * *'} (凌晨4:30)`);
  }
  if (process.env.SSL_SCAN_ENABLED === 'true') {
    console.log(`- SSL扫描: ${process.env.SSL_SCAN_CRON || '0 5 * * *'} (凌晨5:00)`);
  }
  if (process.env.ALERT_ENABLED === 'true') {
    console.log(`- 告警通知: ${process.env.ALERT_CRON || '0 12 * * *'} (中午12:00)`);
  }
  
  console.log(`\n系统监控:`);
  console.log(`- MongoDB状态: ${mongoose.connection.readyState === 1 ? '已连接' : '未连接'}`);
  console.log(`- 进程ID: ${process.pid}`);
  console.log(`- Node.js版本: ${process.version}`);
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，开始优雅关闭...');
  mongoose.connection.close(() => {
    console.log('MongoDB连接已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，开始优雅关闭...');
  mongoose.connection.close(() => {
    console.log('MongoDB连接已关闭');
    process.exit(0);
  });
});

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  logScan(`未捕获的异常: ${error.message}`, 'error');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  logScan(`未处理的Promise拒绝: ${reason}`, 'error');
});
