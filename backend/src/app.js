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

// 定时任务设置 - 域名扫描
if (process.env.SCAN_ENABLED === 'true') {
  const cronExpression = process.env.SCAN_CRON || '30 4 * * *';
  
  cron.schedule(cronExpression, async () => {
    logScan('开始执行定时域名扫描任务');
    
    const { ScanTask } = require('./models');
    const { batchScanDomains } = require('./routes');
    
    const taskId = `domain_scheduled_${Date.now()}`;
    const task = new ScanTask({
      taskId,
      taskType: 'domain',
      triggeredBy: 'scheduled'
    });
    await task.save();
    
    // 异步执行扫描
    require('./routes').batchScanDomains(taskId).catch(error => {
      logScan(`定时扫描任务失败: ${error.message}`, 'error');
    });
  });
  
  console.log(`域名扫描定时任务已启用，执行时间: ${cronExpression}`);
}

// 定时任务设置 - SSL证书扫描
if (process.env.SSL_SCAN_ENABLED === 'true') {
  const sslCronExpression = process.env.SSL_SCAN_CRON || '0 5 * * *';
  
  cron.schedule(sslCronExpression, async () => {
    logSSL('开始执行定时SSL证书扫描任务');
    
    const { ScanTask } = require('./models');
    const { batchScanSSLCertificates } = require('./routes');
    
    const taskId = `ssl_scheduled_${Date.now()}`;
    const task = new ScanTask({
      taskId,
      taskType: 'ssl',
      triggeredBy: 'scheduled'
    });
    await task.save();
    
    // 异步执行扫描
    require('./routes').batchScanSSLCertificates(taskId).catch(error => {
      logSSL(`定时SSL扫描任务失败: ${error.message}`, 'error');
    });
  });
  
  console.log(`SSL证书扫描定时任务已启用，执行时间: ${sslCronExpression}`);
}

// 告警定时任务设置
if (process.env.ALERT_ENABLED === 'true') {
  const alertCron = process.env.ALERT_CRON || '0 12 * * *';
  
  cron.schedule(alertCron, async () => {
    logAlert('开始执行定时告警任务');
    checkAndSendAlerts().catch(error => {
      logAlert(`定时告警任务失败: ${error.message}`, 'error');
    });
  });
  
  console.log(`告警定时任务已启用，执行时间: ${alertCron}`);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n域名管理系统 v3.0 后端服务启动成功`);
  console.log(`运行端口: ${PORT}`);
  console.log(`\n功能状态:`);
  console.log(`- 域名扫描: ${process.env.SCAN_ENABLED === 'true' ? '已启用' : '已禁用'}`);
  console.log(`- SSL证书扫描: ${process.env.SSL_SCAN_ENABLED === 'true' ? '已启用' : '已禁用'}`);
  console.log(`- 告警功能: ${process.env.ALERT_ENABLED === 'true' ? '已启用' : '已禁用'}`);
  
  if (process.env.SCAN_ENABLED === 'true') {
    console.log(`\n定时任务:`);
    console.log(`- 域名扫描: ${process.env.SCAN_CRON || '30 4 * * *'}`);
  }
  if (process.env.SSL_SCAN_ENABLED === 'true') {
    console.log(`- SSL扫描: ${process.env.SSL_SCAN_CRON || '0 5 * * *'}`);
  }
  if (process.env.ALERT_ENABLED === 'true') {
    console.log(`- 告警通知: ${process.env.ALERT_CRON || '0 12 * * *'}`);
  }
});
