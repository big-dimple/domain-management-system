const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

// 扫描日志
const logScan = (message, level = 'info') => {
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const logMessage = `[${timestamp}] [SCAN] [${level.toUpperCase()}] ${message}\n`;
  
  // 写入日志文件
  const logFile = path.join('/app/logs', `scan_${dayjs().format('YYYY-MM-DD')}.log`);
  fs.appendFileSync(logFile, logMessage);
  
  // 控制台输出
  console.log(logMessage.trim());
};

// .cn域名专用查询函数
async function queryCnDomain(domainName) {
  return new Promise((resolve, reject) => {
    // 使用特定的whois服务器查询.cn域名
    execFile('whois', ['-h', 'whois.cnnic.cn', domainName], { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        logScan(`CN域名查询失败 ${domainName}: ${error.message}`, 'error');
        reject(error);
        return;
      }
      
      try {
        // .cn域名特定的日期格式解析
        let expiryDate = null;
        let registrar = null;
        let nameServers = [];
        
        // .cn域名使用的是 "Expiration Time: YYYY-MM-DD HH:MM:SS" 格式
        const cnExpiryMatch = stdout.match(/Expiration Time:\s*([^\n]+)/i);
        if (cnExpiryMatch) {
          const dateStr = cnExpiryMatch[1].trim();
          expiryDate = new Date(dateStr);
          if (isNaN(expiryDate.getTime())) {
            // 尝试其他格式
            expiryDate = new Date(dateStr.replace(/\s+/g, 'T'));
          }
        }
        
        // 如果还是没找到，尝试其他可能的格式
        if (!expiryDate || isNaN(expiryDate.getTime())) {
          const altMatch = stdout.match(/到期时间[：:]\s*([^\n]+)/i) || 
                          stdout.match(/过期时间[：:]\s*([^\n]+)/i);
          if (altMatch) {
            expiryDate = new Date(altMatch[1].trim());
          }
        }
        
        // 提取注册商
        const registrarMatch = stdout.match(/Sponsoring Registrar:\s*([^\n]+)/i) || 
                              stdout.match(/Registrar:\s*([^\n]+)/i);
        if (registrarMatch) {
          registrar = registrarMatch[1].trim();
        }
        
        // 提取DNS服务器
        const nsMatches = stdout.match(/Name Server:\s*([^\n]+)/gi);
        if (nsMatches) {
          nameServers = nsMatches.map(ns => 
            ns.replace(/Name Server:\s*/i, '').trim()
          );
        }
        
        if (expiryDate && !isNaN(expiryDate.getTime())) {
          resolve({
            expiryDate,
            registrar,
            nameServers,
            rawData: stdout
          });
        } else {
          reject(new Error('无法从.cn域名查询结果中提取到期日期'));
        }
        
      } catch (parseError) {
        logScan(`解析CN域名数据失败 ${domainName}: ${parseError.message}`, 'error');
        reject(parseError);
      }
    });
  });
}

// 通用域名查询函数（改进版）
async function queryGeneralDomain(domainName) {
  return new Promise((resolve, reject) => {
    // 增加超时时间到30秒
    execFile('whois', [domainName], { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        logScan(`whois查询失败 ${domainName}: ${error.message}`, 'error');
        reject(new Error(`whois查询失败: ${error.message}`));
        return;
      }
      
      try {
        const whoisData = stdout.toLowerCase();
        let expiryDate = null;
        let registrar = null;
        let nameServers = [];
        
        // 提取到期日期 - 支持更多格式
        const expiryPatterns = [
          /expir[ey]\s*date:\s*([^\n]+)/i,
          /expir[ey]\s*on:\s*([^\n]+)/i,
          /expiration\s*date:\s*([^\n]+)/i,
          /registry\s*expiry\s*date:\s*([^\n]+)/i,
          /paid-till:\s*([^\n]+)/i,
          /valid\s*until:\s*([^\n]+)/i,
          /expire:\s*([^\n]+)/i,
          /renewal\s*date:\s*([^\n]+)/i
        ];
        
        for (const pattern of expiryPatterns) {
          const match = stdout.match(pattern);
          if (match) {
            const dateStr = match[1].trim();
            // 尝试多种日期解析方式
            let parsedDate = new Date(dateStr);
            
            if (isNaN(parsedDate.getTime())) {
              // 处理特殊格式，如 "2024.12.31"
              const converted = dateStr.replace(/\./g, '-');
              parsedDate = new Date(converted);
            }
            
            if (isNaN(parsedDate.getTime())) {
              // 处理格式如 "31-Dec-2024"
              const monthMap = {
                'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
                'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
                'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
              };
              const parts = dateStr.toLowerCase().split(/[-\/\s]/);
              if (parts.length >= 3) {
                const month = monthMap[parts[1].substr(0, 3)];
                if (month) {
                  parsedDate = new Date(`${parts[2]}-${month}-${parts[0]}`);
                }
              }
            }
            
            if (!isNaN(parsedDate.getTime())) {
              expiryDate = parsedDate;
              break;
            }
          }
        }
        
        // 提取注册商
        const registrarMatch = stdout.match(/registrar:\s*([^\n]+)/i);
        if (registrarMatch) {
          registrar = registrarMatch[1].trim();
        }
        
        // 提取DNS服务器
        const nsMatches = stdout.match(/name\s*server:\s*([^\n]+)/gi);
        if (nsMatches) {
          nameServers = nsMatches.map(ns => 
            ns.replace(/name\s*server:\s*/i, '').trim()
          );
        }
        
        if (!expiryDate) {
          logScan(`未能从whois提取到期日期 ${domainName}，尝试备用方法`, 'warn');
          reject(new Error('无法提取到期日期'));
          return;
        }
        
        resolve({
          expiryDate,
          registrar,
          nameServers,
          rawData: stdout
        });
        
      } catch (parseError) {
        logScan(`解析whois数据失败 ${domainName}: ${parseError.message}`, 'error');
        reject(parseError);
      }
    });
  });
}

// 带重试的域名扫描函数
async function scanDomainWithRetry(domainName, maxRetries = 3) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logScan(`扫描域名 ${domainName}（第 ${attempt}/${maxRetries} 次尝试）`);
      
      // 根据域名后缀选择不同的查询方法
      const domain = domainName.toLowerCase();
      let result;
      
      if (domain.endsWith('.cn') || domain.endsWith('.com.cn') || 
          domain.endsWith('.net.cn') || domain.endsWith('.org.cn')) {
        // 中国域名使用专门的查询方法
        result = await queryCnDomain(domainName);
      } else {
        // 其他域名使用通用方法
        result = await queryGeneralDomain(domainName);
      }
      
      logScan(`域名 ${domainName} 扫描成功`);
      return result;
      
    } catch (error) {
      lastError = error;
      logScan(`域名 ${domainName} 第 ${attempt} 次扫描失败: ${error.message}`, 'warn');
      
      if (attempt < maxRetries) {
        // 等待一段时间后重试，避免频率过高
        const waitTime = attempt * 2000; // 2秒、4秒、6秒递增
        logScan(`等待 ${waitTime/1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // 所有重试都失败
  logScan(`域名 ${domainName} 扫描最终失败: ${lastError.message}`, 'error');
  throw lastError;
}

// 导出主函数
async function scanDomainExpiry(domainName) {
  return scanDomainWithRetry(domainName);
}

module.exports = {
  scanDomainExpiry,
  logScan
};
