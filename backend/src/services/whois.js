const whois = require('whois-json');
const { parseISO, isValid } = require('date-fns');

/**
 * 查询域名的WHOIS信息
 * @param {string} domainName - 要查询的域名
 * @returns {Promise<Object>} - 返回WHOIS查询结果
 */
const lookupDomain = async (domainName) => {
  try {
    // 执行WHOIS查询
    const result = await whois(domainName, { follow: 3, timeout: 10000 });
    return result;
  } catch (error) {
    console.error(`WHOIS查询失败: ${domainName}`, error);
    throw new Error(`WHOIS查询失败: ${error.message}`);
  }
};

/**
 * 从WHOIS响应中提取域名到期日期
 * @param {Object} whoisData - WHOIS查询结果
 * @returns {Date|null} - 返回到期日期或null
 */
const extractExpiryDate = (whoisData) => {
  // 各种可能的到期日期字段名
  const expiryFields = [
    'registryExpiryDate',
    'expiryDate',
    'expires',
    'paid-till',
    'registrarRegistrationExpirationDate',
    'domain_dateexpire',
    'expiration_date',
    'expiry_date',
    'expire',
    'Expiry Date',
    'Registry Expiry Date'
  ];

  // 尝试从各种可能的字段中提取日期
  for (const field of expiryFields) {
    let dateValue = whoisData[field];
    
    // 处理一些特殊情况，如数组值
    if (Array.isArray(dateValue)) {
      dateValue = dateValue[0];
    }
    
    if (dateValue) {
      // 尝试解析日期
      try {
        // 对于某些非标准格式的日期，可能需要特殊处理
        const parsedDate = parseISO(dateValue);
        if (isValid(parsedDate)) {
          return parsedDate;
        }
      } catch (error) {
        console.warn(`无法解析日期值: ${dateValue}`);
      }
    }
  }

  // 未找到有效的到期日期
  return null;
};

/**
 * 查询域名的到期日期
 * @param {string} domainName - 要查询的域名
 * @returns {Promise<Date|null>} - 返回到期日期或null
 */
const getDomainExpiryDate = async (domainName) => {
  try {
    const whoisData = await lookupDomain(domainName);
    return extractExpiryDate(whoisData);
  } catch (error) {
    console.error(`获取域名到期日期失败: ${domainName}`, error);
    return null;
  }
};

module.exports = {
  lookupDomain,
  extractExpiryDate,
  getDomainExpiryDate
};
