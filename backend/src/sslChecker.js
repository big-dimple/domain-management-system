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
        
        // 增强证书有效性检查
        if (!cert || Object.keys(cert).length === 0 || !cert.valid_from || !cert.valid_to) {
          logSSL(`证书信息无效或为空: ${domain}`, 'error');
          socket.end();
          resolve({
            domain,
            status: 'error',
            accessible: false,
            checkError: '无法获取有效的证书信息',
            daysRemaining: -1,
            validTo: null,
            validFrom: null
          });
          return;
        }
        
        // 解析证书信息
        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        const now = new Date();
        
        // 验证日期有效性
        if (isNaN(validFrom.getTime()) || isNaN(validTo.getTime())) {
          logSSL(`证书日期格式无效: ${domain}`, 'error');
          socket.end();
          resolve({
            domain,
            status: 'error',
            accessible: false,
            checkError: '证书日期格式无效',
            daysRemaining: -1,
            validTo: null,
            validFrom: null
          });
          return;
        }
        
        // 检查证书是否为未来很远的日期（可能是假证书）
        const futureLimit = new Date();
        futureLimit.setFullYear(futureLimit.getFullYear() + 10);
        if (validTo > futureLimit || validFrom > now) {
          logSSL(`证书日期异常: ${domain}, validFrom: ${validFrom}, validTo: ${validTo}`, 'error');
          socket.end();
          resolve({
            domain,
            status: 'error',
            accessible: false,
            checkError: '证书日期异常，可能是无效证书',
            daysRemaining: -1,
            validTo: null,
            validFrom: null
          });
          return;
        }
        
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
          accessible: true
        };
        
        logSSL(`SSL证书检查成功: ${domain}, 剩余${daysRemaining}天, 状态: ${status}`);
        socket.end();
        resolve(result);
        
      } catch (error) {
        socket.end();
        logSSL(`SSL证书解析失败 ${domain}: ${error.message}`, 'error');
        resolve({
          domain,
          status: 'error',
          accessible: false,
          checkError: `证书解析失败: ${error.message}`,
          daysRemaining: -1,
          validTo: null,
          validFrom: null
        });
      }
    });
    
    socket.on('error', (error) => {
      logSSL(`SSL连接失败 ${domain}: ${error.message}`, 'error');
      
      // 根据错误类型返回更准确的错误信息
      let errorMessage = error.message;
      if (error.code === 'ENOTFOUND') {
        errorMessage = '域名不存在或DNS解析失败';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = '连接被拒绝，端口未开放';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = '连接超时';
      } else if (error.code === 'EHOSTUNREACH') {
        errorMessage = '主机不可达';
      }
      
      const errorResult = {
        domain,
        status: 'error',
        accessible: false,
        checkError: errorMessage,
        daysRemaining: -1,
        validTo: null,
        validFrom: null
      };
      
      resolve(errorResult);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      logSSL(`SSL连接超时 ${domain}`, 'error');
      
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
