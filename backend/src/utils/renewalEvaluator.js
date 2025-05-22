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
