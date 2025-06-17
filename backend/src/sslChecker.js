const tls = require('tls');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

// SSL检查日志
const logSSL = (message, level = 'info') => {
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const logMessage = `[${timestamp}] [SSL] [${level.toUpperCase()}] ${message}\n`;
  
  // 写入日志文件
  const logFile = path.join('/app/logs', `ssl_${dayjs().format('YYYY-MM-DD')}.log`);
  fs.appendFileSync(logFile, logMessage);
  
  // 控制台输出
  console.log(logMessage.trim());
};

// 检查SSL证书
async function checkSSLCertificate(domain, port = 443) {
  return new Promise((resolve, reject) => {
    logSSL(`开始检查SSL证书: ${domain}:${port}`);
    
    const options = {
      host: domain,
      port: port,
      servername: domain,
      rejectUnauthorized: false,
      timeout: 10000
    };
    
    const socket = tls.connect(options, () => {
      try {
        const cert = socket.getPeerCertificate(true);
        
        if (!cert || Object.keys(cert).length === 0) {
          throw new Error('无法获取证书信息');
        }
        
        // 解析证书信息
        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        const now = new Date();
        const daysRemaining = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));
        
        // 判断状态
        let status = 'active';
        if (daysRemaining < 0) {
          status = 'expired';
        } else if (daysRemaining <= 7) {
          status = 'critical';
        } else if (daysRemaining <= 30) {
          status = 'warning';
        }
        
        const result = {
          domain,
          issuer: cert.issuer ? formatDN(cert.issuer) : 'Unknown',
          subject: cert.subject ? formatDN(cert.subject) : domain,
          validFrom,
          validTo,
          daysRemaining,
          serialNumber: cert.serialNumber,
          fingerprint: cert.fingerprint,
          status,
          isWildcard: cert.subject && cert.subject.CN && cert.subject.CN.startsWith('*.'),
          alternativeNames: cert.subjectaltname ? 
            cert.subjectaltname.split(', ').map(name => name.replace('DNS:', '')) : [domain],
          accessible: true  // 标记为可访问
        };
        
        logSSL(`SSL证书检查成功: ${domain}, 剩余${daysRemaining}天`);
        socket.end();
        resolve(result);
        
      } catch (error) {
        socket.end();
        logSSL(`SSL证书解析失败 ${domain}: ${error.message}`, 'error');
        reject(error);
      }
    });
    
    socket.on('error', (error) => {
      logSSL(`SSL连接失败 ${domain}: ${error.message}`, 'error');
      
      // 返回特殊的错误状态对象，而不是直接reject
      // 这样可以在批量扫描时正确更新状态
      const errorResult = {
        domain,
        status: 'error',
        accessible: false,
        checkError: error.message,
        daysRemaining: -1,
        validTo: null,
        validFrom: null
      };
      
      resolve(errorResult); // 改为resolve，让调用方处理
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      logSSL(`SSL连接超时 ${domain}`, 'error');
      
      // 同样返回错误状态对象
      const timeoutResult = {
        domain,
        status: 'error',
        accessible: false,
        checkError: 'SSL连接超时',
        daysRemaining: -1,
        validTo: null,
        validFrom: null
      };
      
      resolve(timeoutResult);
    });
  });
}

// 格式化证书DN信息
function formatDN(dn) {
  if (!dn) return 'Unknown';
  
  const parts = [];
  if (dn.CN) parts.push(`CN=${dn.CN}`);
  if (dn.O) parts.push(`O=${dn.O}`);
  if (dn.C) parts.push(`C=${dn.C}`);
  
  return parts.join(', ') || 'Unknown';
}

// 使用openssl命令检查（备用方法）
async function checkSSLWithOpenSSL(domain, port = 443) {
  return new Promise((resolve, reject) => {
    const args = [
      's_client',
      '-connect', `${domain}:${port}`,
      '-servername', domain,
      '-showcerts'
    ];
    
    const child = execFile('openssl', args, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error && !stdout) {
        logSSL(`OpenSSL检查失败 ${domain}: ${error.message}`, 'error');
        reject(error);
        return;
      }
      
      try {
        // 解析openssl输出
        const certMatch = stdout.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
        if (!certMatch) {
          throw new Error('无法从输出中提取证书');
        }
        
        // 这里可以进一步解析证书内容
        // 简化处理，返回基本信息
        resolve({
          domain,
          rawCertificate: certMatch[0],
          checkMethod: 'openssl'
        });
        
      } catch (parseError) {
        logSSL(`OpenSSL输出解析失败 ${domain}: ${parseError.message}`, 'error');
        reject(parseError);
      }
    });
    
    // 发送退出命令
    setTimeout(() => {
      child.stdin.write('QUIT\n');
      child.stdin.end();
    }, 1000);
  });
}

module.exports = {
  checkSSLCertificate,
  checkSSLWithOpenSSL,
  logSSL
};
