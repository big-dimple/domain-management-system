const axios = require('axios');
const dayjs = require('dayjs');
const { Domain, SSLCertificate, AlertConfig } = require('./models');
const fs = require('fs');
const path = require('path');

// 告警日志
const logAlert = (message, level = 'info') => {
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const logMessage = `[${timestamp}] [ALERT] [${level.toUpperCase()}] ${message}\n`;
  
  // 写入日志文件
  const logFile = path.join('/app/logs', `alert_${dayjs().format('YYYY-MM-DD')}.log`);
  fs.appendFileSync(logFile, logMessage);
  
  // 控制台输出
  console.log(logMessage.trim());
};

// 发送钉钉告警
async function sendDingTalkAlert(webhook, content) {
  const data = {
    msgtype: 'text',
    text: { content }
  };
  
  try {
    const response = await axios.post(webhook, data);
    if (response.data.errcode === 0) {
      logAlert(`钉钉告警发送成功`);
      return { success: true };
    } else {
      throw new Error(`钉钉API错误: ${response.data.errmsg}`);
    }
  } catch (error) {
    logAlert(`钉钉告警发送失败: ${error.message}`, 'error');
    throw error;
  }
}

// 发送企业微信告警
async function sendWeChatAlert(webhook, content) {
  const data = {
    msgtype: 'text',
    text: { content }
  };
  
  try {
    const response = await axios.post(webhook, data);
    if (response.data.errcode === 0) {
      logAlert(`企业微信告警发送成功`);
      return { success: true };
    } else {
      throw new Error(`企业微信API错误: ${response.data.errmsg}`);
    }
  } catch (error) {
    logAlert(`企业微信告警发送失败: ${error.message}`, 'error');
    throw error;
  }
}

// 发送飞书告警
async function sendFeishuAlert(webhook, content) {
  const data = {
    msg_type: 'text',
    content: {
      text: content
    }
  };
  
  try {
    const response = await axios.post(webhook, data);
    // 飞书机器人成功响应通常返回 {"code":0} 或者 {"StatusCode":0}
    if (response.data.code === 0 || response.data.StatusCode === 0 || response.status === 200) {
      logAlert(`飞书告警发送成功`);
      return { success: true };
    } else {
      throw new Error(`飞书API错误: ${response.data.msg || response.data.message || '未知错误'}`);
    }
  } catch (error) {
    logAlert(`飞书告警发送失败: ${error.message}`, 'error');
    throw error;
  }
}

// 构建域名告警内容
function buildDomainAlertContent(domains) {
  const groups = {
    '紧急续费': [],
    '建议续费': [],
    '请示领导': [],
    '保持续费': []
  };
  
  domains.forEach(domain => {
    const daysUntilExpiry = dayjs(domain.expiryDate).diff(dayjs(), 'day');
    if (groups[domain.renewalSuggestion]) {
      groups[domain.renewalSuggestion].push({
        name: domain.domainName,
        days: daysUntilExpiry,
        date: dayjs(domain.expiryDate).format('YYYY-MM-DD')
      });
    }
  });
  
  let content = '【域名到期提醒】\n\n';
  
  if (groups['紧急续费'].length > 0) {
    content += '🔴 紧急续费：\n';
    groups['紧急续费'].forEach(d => {
      content += `  • ${d.name} - ${d.date} (${d.days}天)\n`;
    });
    content += '\n';
  }
  
  if (groups['建议续费'].length > 0) {
    content += '🟢 建议续费：\n';
    groups['建议续费'].forEach(d => {
      content += `  • ${d.name} - ${d.date} (${d.days}天)\n`;
    });
    content += '\n';
  }
  
  if (groups['请示领导'].length > 0) {
    content += '🟡 请示领导：\n';
    groups['请示领导'].forEach(d => {
      content += `  • ${d.name} - ${d.date} (${d.days}天)\n`;
    });
    content += '\n';
  }
  
  if (groups['保持续费'].length > 0) {
    content += '🔵 保持续费：\n';
    groups['保持续费'].forEach(d => {
      content += `  • ${d.name} - ${d.date} (${d.days}天)\n`;
    });
  }
  
  return content;
}

// 构建SSL证书告警内容
function buildSSLAlertContent(certificates) {
  const groups = {
    error: [],      // 新增：无法访问
    critical: [],
    warning: [],
    expired: [],    // 新增：已过期
    active: []
  };
  
  certificates.forEach(cert => {
    const group = groups[cert.status];
    if (group) {
      group.push({
        domain: cert.domain,
        days: cert.daysRemaining,
        date: cert.validTo ? dayjs(cert.validTo).format('YYYY-MM-DD') : '未知',
        issuer: cert.issuer || '未知',
        error: cert.checkError
      });
    }
  });
  
  let content = '【SSL证书到期提醒】\n\n';
  
  if (groups.error.length > 0) {
    content += '❌ 无法访问：\n';
    groups.error.forEach(c => {
      content += `  • ${c.domain} - ${c.error || '连接失败'}\n`;
    });
    content += '\n';
  }
  
  if (groups.expired.length > 0) {
    content += '⚫ 已过期：\n';
    groups.expired.forEach(c => {
      content += `  • ${c.domain} - ${c.date} (已过期${Math.abs(c.days)}天)\n`;
    });
    content += '\n';
  }
  
  if (groups.critical.length > 0) {
    content += '🔴 紧急处理：\n';
    groups.critical.forEach(c => {
      content += `  • ${c.domain} - ${c.date} (${c.days}天) - ${c.issuer}\n`;
    });
    content += '\n';
  }
  
  if (groups.warning.length > 0) {
    content += '🟡 即将到期：\n';
    groups.warning.forEach(c => {
      content += `  • ${c.domain} - ${c.date} (${c.days}天) - ${c.issuer}\n`;
    });
    content += '\n';
  }
  
  if (groups.active.length > 0) {
    content += '🟢 正常关注：\n';
    const limitedActive = groups.active.slice(0, 5);
    limitedActive.forEach(c => {
      content += `  • ${c.domain} - ${c.date} (${c.days}天)\n`;
    });
    if (groups.active.length > 5) {
      content += `  • ... 还有 ${groups.active.length - 5} 个证书\n`;
    }
  }
  
  return content;
}

// 检查并发送告警
async function checkAndSendAlerts() {
  logAlert('开始执行告警检查');
  
  try {
    // 获取所有启用的告警配置
    const alertConfigs = await AlertConfig.find({ enabled: true });
    
    if (alertConfigs.length === 0) {
      logAlert('没有配置告警通知');
      return;
    }
    
    // 对每个告警配置进行处理
    for (const config of alertConfigs) {
      try {
        let alertContent = '';
        let itemCount = 0;
        
        // 检查是否需要发送域名告警
        if (config.alertTypes.includes('domain') || config.alertTypes.includes('both')) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + (config.domainDaysBeforeExpiry || 30));
          
          const expiringDomains = await Domain.find({
            expiryDate: {
              $gte: new Date(),
              $lte: expiryDate
            },
            renewalSuggestion: { 
              $in: ['紧急续费', '建议续费', '请示领导', '保持续费'] 
            }
          }).sort({ expiryDate: 1 });
          
          if (expiringDomains.length > 0) {
            alertContent += buildDomainAlertContent(expiringDomains);
            itemCount += expiringDomains.length;
          }
        }
        
        // 检查是否需要发送SSL告警
        if (config.alertTypes.includes('ssl') || config.alertTypes.includes('both')) {
          const sslExpiryDate = new Date();
          sslExpiryDate.setDate(sslExpiryDate.getDate() + (config.sslDaysBeforeExpiry || 14));
          
          const expiringCertificates = await SSLCertificate.find({
            validTo: {
              $gte: new Date(),
              $lte: sslExpiryDate
            },
            status: { $in: ['critical', 'warning', 'active'] }
          }).sort({ validTo: 1 });
          
          if (expiringCertificates.length > 0) {
            if (alertContent) alertContent += '\n\n';
            alertContent += buildSSLAlertContent(expiringCertificates);
            itemCount += expiringCertificates.length;
          }
        }
        
        // 如果有内容需要发送
        if (alertContent && itemCount > 0) {
          logAlert(`${config.name} - 发现 ${itemCount} 个需要关注的项目`);
          
          // 发送告警
          let result;
          if (config.type === 'dingtalk') {
            result = await sendDingTalkAlert(config.webhook, alertContent);
          } else if (config.type === 'wechat') {
            result = await sendWeChatAlert(config.webhook, alertContent);
          } else if (config.type === 'feishu') {
            result = await sendFeishuAlert(config.webhook, alertContent);
          }
          
          // 更新告警历史
          config.lastAlertTime = new Date();
          config.alertHistory.push({
            sentAt: new Date(),
            itemCount: itemCount,
            alertType: config.alertTypes.join(','),
            success: true
          });
          
          // 只保留最近30条历史记录
          if (config.alertHistory.length > 30) {
            config.alertHistory = config.alertHistory.slice(-30);
          }
          
          await config.save();
        } else {
          logAlert(`${config.name} - 没有需要告警的项目`);
        }
        
      } catch (error) {
        logAlert(`${config.name} - 告警发送失败: ${error.message}`, 'error');
        
        // 记录失败历史
        config.alertHistory.push({
          sentAt: new Date(),
          itemCount: 0,
          success: false,
          error: error.message
        });
        
        if (config.alertHistory.length > 30) {
          config.alertHistory = config.alertHistory.slice(-30);
        }
        
        await config.save();
      }
    }
    
    logAlert('告警检查完成');
    
  } catch (error) {
    logAlert(`告警检查异常: ${error.message}`, 'error');
  }
}

// 测试告警配置
async function testAlertWebhook(type, webhook) {
  const testContent = '【测试消息】\n\n这是一条测试消息，用于验证告警通道是否正常。\n\n' +
    '域名示例：\n' +
    '  • test-domain.com - 2024-06-15 (15天)\n\n' +
    'SSL证书示例：\n' +
    '  • test-ssl.com - 2024-06-20 (20天)\n\n' +
    '如果您收到此消息，说明告警通道配置正确。';
  
  try {
    if (type === 'dingtalk') {
      await sendDingTalkAlert(webhook, testContent);
    } else if (type === 'wechat') {
      await sendWeChatAlert(webhook, testContent);
    } else if (type === 'feishu') {
      await sendFeishuAlert(webhook, testContent);
    }
    
    return { success: true, message: '测试消息发送成功' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = {
  checkAndSendAlerts,
  testAlertWebhook,
  logAlert
};
