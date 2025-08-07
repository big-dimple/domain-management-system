const { execFile, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const os = require('os');

// 扫描日志
const logScan = (message, level = 'info') => {
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const logMessage = `[${timestamp}] [SCAN] [${level.toUpperCase()}] ${message}  \n`;
  
  // 写入日志文件
  const logDir = process.env.NODE_ENV === 'production' ? '/app/logs' : path.join(__dirname, '../../logs');
  const logFile = path.join(logDir, `scan_${dayjs().format('YYYY-MM-DD')}.log`);
  fs.appendFileSync(logFile, logMessage);
  
  // 控制台输出
  console.log(logMessage.trim());
};

// .cn域名专用查询函数
async function queryCnDomain(domainName) {
  return new Promise((resolve, reject) => {
    // 使用特定的whois服务器查询.cn域名
    const options = {
      timeout: 45000,
      env: { ...process.env, PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' },
      cwd: process.cwd()
    };
    
    execFile('whois', ['-h', 'whois.cnnic.cn', domainName], options, (error, stdout, stderr) => {
      if (error) {
        // 详细的错误信息记录
        const errorDetails = {
          message: error.message,
          code: error.code,
          signal: error.signal,
          stderr: stderr ? stderr.trim() : 'N/A',
          stdout: stdout ? stdout.substring(0, 200) + '...' : 'N/A',
          command: `whois -h whois.cnnic.cn ${domainName}`,
          pid: error.pid,
          timeout: error.code === 'ETIMEDOUT'
        };
        
        logScan(`CN域名查询失败 ${domainName}: ${JSON.stringify(errorDetails, null, 2)}`, 'error');
        reject(new Error(`CN域名查询失败: ${error.code || error.message} - ${stderr || error.message}`));
        return;
      }
      
      if (!stdout || stdout.trim().length === 0) {
        logScan(`CN域名查询返回空结果 ${domainName}`, 'error');
        reject(new Error('CN域名查询返回空结果'));
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
    // 设置执行环境和选项
    const options = {
      timeout: 45000,
      env: { 
        ...process.env, 
        PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
        LANG: 'C',
        LC_ALL: 'C'
      },
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 2 // 2MB buffer
    };
    
    logScan(`执行whois查询: whois ${domainName} (PID: ${process.pid})`);
    
    execFile('whois', [domainName], options, (error, stdout, stderr) => {
      // 检查是否有stdout数据，即使有错误
      if (error) {
        // 详细的错误信息记录
        const errorDetails = {
          domain: domainName,
          message: error.message,
          code: error.code,
          signal: error.signal,
          stderr: stderr ? stderr.trim() : 'N/A',
          stdout: stdout ? stdout.substring(0, 200) + '...' : 'N/A',
          command: `whois ${domainName}`,
          pid: error.pid,
          timeout: error.code === 'ETIMEDOUT',
          killed: error.killed,
          platform: os.platform(),
          arch: os.arch(),
          nodeVersion: process.version,
          cwd: process.cwd(),
          env: {
            PATH: process.env.PATH?.substring(0, 100) + '...',
            LANG: process.env.LANG,
            LC_ALL: process.env.LC_ALL
          }
        };
        
        logScan(`whois查询失败 ${domainName}: ${JSON.stringify(errorDetails, null, 2)}`, 'error');
        
        // 如果有输出数据且错误是连接中断相关，尝试解析已有数据
        if (stdout && stdout.trim().length > 0 && 
            (stderr.includes('Connection reset by peer') || 
             stderr.includes('fgets:') ||
             error.message.includes('Connection reset by peer') ||
             error.message.includes('fgets:') ||
             error.signal === 'SIGPIPE' ||
             error.code === 2)) {
          
          logScan(`虽然连接中断，但获取到部分数据，尝试解析 ${domainName}`, 'warn');
          
          try {
            // 尝试解析部分数据
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
                let parsedDate = new Date(dateStr);
                
                if (isNaN(parsedDate.getTime())) {
                  const converted = dateStr.replace(/\./g, '-');
                  parsedDate = new Date(converted);
                }
                
                if (isNaN(parsedDate.getTime())) {
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
            
            if (expiryDate) {
              logScan(`从部分数据中成功提取到期日期 ${domainName}: ${expiryDate}`, 'info');
              resolve({
                expiryDate,
                registrar,
                nameServers,
                rawData: stdout,
                partialData: true // 标记为部分数据
              });
              return;
            }
            
          } catch (parseError) {
            logScan(`解析部分数据失败 ${domainName}: ${parseError.message}`, 'warn');
          }
        }
        
        // 根据不同错误类型给出不同的提示
        let errorMessage = `whois查询失败: ${error.code || error.message}`;
        if (stderr) {
          errorMessage += ` - stderr: ${stderr.trim()}`;
        }
        if (error.code === 'ETIMEDOUT') {
          errorMessage += ' (查询超时，可能网络问题或whois服务器繁忙)';
        } else if (error.code === 'ENOENT') {
          errorMessage += ' (whois命令未找到，请检查是否已安装)';
        }
        
        reject(new Error(errorMessage));
        return;
      }
      
      if (!stdout || stdout.trim().length === 0) {
        logScan(`whois查询返回空结果 ${domainName}`, 'error');
        reject(new Error('whois查询返回空结果'));
        return;
      }
      
      logScan(`whois查询成功 ${domainName}, 返回数据长度: ${stdout.length}`);
      
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

// 使用spawn的备用查询方法
async function queryWithSpawn(domainName) {
  return new Promise((resolve, reject) => {
    const whoisProcess = spawn('whois', [domainName], {
      env: {
        ...process.env,
        PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
        LANG: 'C',
        LC_ALL: 'C'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      whoisProcess.kill('SIGKILL');
      reject(new Error('spawn whois查询超时'));
    }, 45000);
    
    whoisProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    whoisProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    whoisProcess.on('error', (error) => {
      clearTimeout(timeout);
      logScan(`spawn whois进程错误 ${domainName}: ${error.message}`, 'error');
      reject(error);
    });
    
    whoisProcess.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        logScan(`spawn whois进程退出码 ${domainName}: ${code}, stderr: ${stderr}`, 'error');
        reject(new Error(`whois进程退出码: ${code}, ${stderr || 'unknown error'}`));
      } else {
        logScan(`spawn whois查询成功 ${domainName}, 数据长度: ${stdout.length}`);
        resolve(stdout);
      }
    });
  });
}

// 带重试的域名扫描函数
async function scanDomainWithRetry(domainName, maxRetries = 3) {
  let lastError = null;
  
  // 添加域名格式验证
  if (!domainName || typeof domainName !== 'string') {
    throw new Error(`无效的域名格式: ${domainName}`);
  }
  
  const cleanDomainName = domainName.toLowerCase().trim();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanDomainName)) {
    throw new Error(`域名格式不正确: ${cleanDomainName}`);
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logScan(`扫描域名 ${cleanDomainName}（第 ${attempt}/${maxRetries} 次尝试）`);
      
      let result;
      let useSpawnFallback = false;
      
      try {
        // 首先尝试原有方法
        if (cleanDomainName.endsWith('.cn') || cleanDomainName.endsWith('.com.cn') || 
            cleanDomainName.endsWith('.net.cn') || cleanDomainName.endsWith('.org.cn')) {
          // 中国域名使用专门的查询方法
          result = await queryCnDomain(cleanDomainName);
        } else {
          // 其他域名使用通用方法
          result = await queryGeneralDomain(cleanDomainName);
        }
      } catch (execFileError) {
        // 如果execFile失败，尝试使用spawn
        if (attempt === 1) {
          logScan(`execFile方法失败，尝试spawn方法 ${cleanDomainName}: ${execFileError.message}`, 'warn');
          useSpawnFallback = true;
        } else {
          throw execFileError;
        }
      }
      
      if (useSpawnFallback) {
        try {
          const rawOutput = await queryWithSpawn(cleanDomainName);
          // 使用通用解析逻辑
          result = await parseWhoisOutput(cleanDomainName, rawOutput);
        } catch (spawnError) {
          logScan(`spawn方法也失败 ${cleanDomainName}: ${spawnError.message}`, 'error');
          throw spawnError;
        }
      }
      
      if (!result || !result.expiryDate) {
        throw new Error('无法从whois查询结果中提取到期日期');
      }
      
      logScan(`域名 ${cleanDomainName} 扫描成功，到期日期: ${result.expiryDate}`);
      return result;
      
    } catch (error) {
      lastError = error;
      const errorMsg = error.message || error.toString();
      logScan(`域名 ${cleanDomainName} 第 ${attempt} 次扫描失败: ${errorMsg}`, 'warn');
      
      if (attempt < maxRetries) {
        // 根据错误类型调整等待时间
        let waitTime = attempt * 3000; // 基础等待时间
        if (errorMsg.includes('timeout') || errorMsg.includes('超时')) {
          waitTime = attempt * 5000; // 超时错误等待更久
        } else if (errorMsg.includes('rate') || errorMsg.includes('频率')) {
          waitTime = attempt * 10000; // 频率限制等待更久
        }
        
        logScan(`等待 ${waitTime/1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // 所有重试都失败
  const finalErrorMessage = `域名 ${cleanDomainName} 扫描最终失败: ${lastError.message}`;
  logScan(finalErrorMessage, 'error');
  throw new Error(finalErrorMessage);
}

// 通用whois输出解析函数
async function parseWhoisOutput(domainName, stdout) {
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
      /renewal\s*date:\s*([^\n]+)/i,
      /expiration\s*time:\s*([^\n]+)/i // 添加.cn域名支持
    ];
    
    for (const pattern of expiryPatterns) {
      const match = stdout.match(pattern);
      if (match) {
        const dateStr = match[1].trim();
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
    const registrarMatch = stdout.match(/registrar:\s*([^\n]+)/i) ||
                          stdout.match(/sponsoring\s*registrar:\s*([^\n]+)/i);
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
      throw new Error('无法从whois输出中提取到期日期');
    }
    
    return {
      expiryDate,
      registrar,
      nameServers,
      rawData: stdout
    };
    
  } catch (parseError) {
    logScan(`解析whois数据失败 ${domainName}: ${parseError.message}`, 'error');
    throw parseError;
  }
}

// 导出主函数
async function scanDomainExpiry(domainName) {
  return scanDomainWithRetry(domainName);
}

module.exports = {
  scanDomainExpiry,
  logScan
};
