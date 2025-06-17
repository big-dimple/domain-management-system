const dayjs = require('dayjs');
const { EvaluationConfig } = require('./models');

// 获取评估配置
async function getEvaluationConfig() {
  let config = await EvaluationConfig.findOne();
  if (!config) {
    // 创建默认配置，忽略环境变量
    config = await EvaluationConfig.create({
      domainConfig: {
        urgentDays: 30,
        suggestDays: 60,
        attentionDays: 90
      },
      sslConfig: {
        criticalDays: 14,
        warningDays: 30,
        attentionDays: 60
      }
    });
  }
  return config;
}

// 智能评估续费建议（域名）
async function evaluateRenewal(domain) {
  // 手动标记不续费的域名
  if (domain.isMarkedForNoRenewal) return '不续费';
  
  const config = await getEvaluationConfig();
  const daysToExpiry = dayjs(domain.expiryDate).diff(dayjs(), 'day');
  
  // 判断域名是否有价值
  const hasValue = domain.hasSpecialValue || 
    (domain.businessUsage && domain.businessUsage !== '未使用' && domain.businessUsage !== '无') ||
    domain.hasICP;
  
  // 根据时间和价值判断
  if (daysToExpiry < 0) {
    // 已过期
    return hasValue ? '紧急续费' : '不续费';
  } else if (daysToExpiry <= config.domainConfig.urgentDays) {
    // 紧急期（默认7天内）
    return hasValue ? '紧急续费' : '请示领导';
  } else if (daysToExpiry <= config.domainConfig.suggestDays) {
    // 建议期（默认30天内）
    return hasValue ? '建议续费' : '请示领导';
  } else if (daysToExpiry <= config.domainConfig.attentionDays) {
    // 关注期（默认90天内）
    return hasValue ? '保持续费' : '待评估';
  } else {
    // 时间充裕（90天以上）
    return hasValue ? '保持续费' : '待评估';
  }
}

// 评估SSL证书状态
async function evaluateSSLStatus(certificate) {
  // 如果证书已经标记为错误状态，不要重新评估
  if (certificate.status === 'error' || certificate.accessible === false) {
    return certificate.status || 'error';
  }
  
  const config = await getEvaluationConfig();
  const daysRemaining = certificate.daysRemaining;
  
  // 只有在证书可访问且有有效daysRemaining时才进行状态评估
  if (typeof daysRemaining !== 'number' || daysRemaining === -1) {
    return 'error';
  }
  
  if (daysRemaining < 0) {
    return 'expired';
  } else if (daysRemaining <= config.sslConfig.criticalDays) {
    return 'critical';
  } else if (daysRemaining <= config.sslConfig.warningDays) {
    return 'warning';
  } else {
    return 'active';
  }
}

// 批量评估所有域名
async function evaluateAllDomains(domains) {
  const results = [];
  for (const domain of domains) {
    const suggestion = await evaluateRenewal(domain);
    if (domain.renewalSuggestion !== suggestion) {
      domain.renewalSuggestion = suggestion;
      await domain.save();
      results.push({
        domainName: domain.domainName,
        oldSuggestion: domain.renewalSuggestion,
        newSuggestion: suggestion
      });
    }
  }
  return results;
}

// 批量评估所有SSL证书
async function evaluateAllSSLCertificates(certificates) {
  const results = [];
  for (const cert of certificates) {
    // 关键修复：跳过错误状态的证书，不要重新评估
    if (cert.status === 'error' || cert.accessible === false) {
      continue;
    }
    
    const status = await evaluateSSLStatus(cert);
    if (cert.status !== status) {
      cert.status = status;
      await cert.save();
      results.push({
        domain: cert.domain,
        oldStatus: cert.status,
        newStatus: status
      });
    }
  }
  return results;
}

module.exports = {
  getEvaluationConfig,
  evaluateRenewal,
  evaluateSSLStatus,
  evaluateAllDomains,
  evaluateAllSSLCertificates
};
