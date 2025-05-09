const Domain = require('../models/Domain');
const History = require('../models/History');
const whoisService = require('../services/whois');
const { differenceInDays, format } = require('date-fns');

/**
 * 检查单个域名的到期日期
 * @param {Object} domain - 域名对象
 * @returns {Promise<boolean>} - 是否更新了到期日期
 */
const checkDomainExpiry = async (domain) => {
  try {
    // 查询WHOIS信息获取最新到期日期
    const expiryDate = await whoisService.getDomainExpiryDate(domain.name);
    
    // 如果获取到有效的到期日期
    if (expiryDate) {
      const oldExpiryDate = new Date(domain.expiryDate);
      
      // 如果到期日期与数据库中的不同，更新域名信息
      if (Math.abs(differenceInDays(expiryDate, oldExpiryDate)) > 1) {
        // 记录旧的到期日期，用于历史记录
        const oldExpiryDateStr = format(oldExpiryDate, 'yyyy-MM-dd');
        const newExpiryDateStr = format(expiryDate, 'yyyy-MM-dd');
        
        // 更新域名到期日期
        domain.expiryDate = expiryDate;
        domain.lastChecked = new Date();
        await domain.save();
        
        // 创建历史记录
        await History.create({
          domainId: domain._id,
          domainName: domain.name,
          action: '更新',
          field: 'expiryDate',
          oldValue: oldExpiryDateStr,
          newValue: newExpiryDateStr,
          reason: '自动检查更新',
          operatedBy: 'system',
          operatedAt: new Date()
        });
        
        console.log(`域名 ${domain.name} 的到期日期已更新: ${oldExpiryDateStr} -> ${newExpiryDateStr}`);
        return true;
      }
    }
    
    // 更新最后检查时间
    domain.lastChecked = new Date();
    await domain.save();
    
    return false;
  } catch (error) {
    console.error(`检查域名 ${domain.name} 失败:`, error);
    return false;
  }
};

/**
 * 检查所有域名的到期日期
 * @returns {Promise<Object>} - 检查结果统计
 */
const checkAllDomains = async () => {
  try {
    // 获取所有域名
    const domains = await Domain.find({});
    console.log(`开始检查 ${domains.length} 个域名的到期日期...`);
    
    const results = {
      total: domains.length,
      updated: 0,
      failed: 0,
      unchanged: 0
    };
    
    // 依次检查每个域名
    // 使用Promise.all会导致大量并发请求可能被WHOIS服务器拒绝
    // 所以这里采用顺序处理
    for (const domain of domains) {
      try {
        const updated = await checkDomainExpiry(domain);
        if (updated) {
          results.updated++;
        } else {
          results.unchanged++;
        }
        
        // 添加短暂延迟，避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`处理域名 ${domain.name} 时出错:`, error);
        results.failed++;
      }
    }
    
    console.log('域名检查完成，结果:', results);
    return results;
  } catch (error) {
    console.error('域名检查过程中出错:', error);
    throw error;
  }
};

module.exports = {
  checkDomainExpiry,
  checkAllDomains
};
