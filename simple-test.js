#!/usr/bin/env node

// 简单的whois测试脚本，独立运行
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 创建日志目录
const logsDir = '/home/domain-management-system/logs';
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// 简单的日志函数
const logScan = (message, level = 'info') => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [SCAN] [${level.toUpperCase()}] ${message}\n`;
    
    const logFile = path.join(logsDir, `scan_${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logMessage);
    
    console.log(logMessage.trim());
};

// 使用改进后的whois查询方法
async function queryDomainImproved(domainName) {
    return new Promise((resolve, reject) => {
        const options = {
            timeout: 45000,
            env: { 
                ...process.env, 
                PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
                LANG: 'C',
                LC_ALL: 'C'
            },
            cwd: process.cwd(),
            maxBuffer: 1024 * 1024 * 2
        };
        
        logScan(`执行whois查询: whois ${domainName} (PID: ${process.pid})`);
        
        execFile('whois', [domainName], options, (error, stdout, stderr) => {
            if (error) {
                const errorDetails = {
                    domain: domainName,
                    message: error.message,
                    code: error.code,
                    signal: error.signal,
                    stderr: stderr ? stderr.trim() : 'N/A',
                    command: `whois ${domainName}`,
                    timeout: error.code === 'ETIMEDOUT'
                };
                
                logScan(`whois查询失败 ${domainName}: ${JSON.stringify(errorDetails, null, 2)}`, 'error');
                reject(new Error(`whois查询失败: ${error.code || error.message} - ${stderr || error.message}`));
                return;
            }
            
            if (!stdout || stdout.trim().length === 0) {
                logScan(`whois查询返回空结果 ${domainName}`, 'error');
                reject(new Error('whois查询返回空结果'));
                return;
            }
            
            logScan(`whois查询成功 ${domainName}, 返回数据长度: ${stdout.length}`);
            
            // 简单的到期日期提取
            const expiryPatterns = [
                /expir[ey]\s*date:\s*([^\n]+)/i,
                /registry\s*expiry\s*date:\s*([^\n]+)/i,
                /paid-till:\s*([^\n]+)/i,
                /valid\s*until:\s*([^\n]+)/i,
                /expire:\s*([^\n]+)/i
            ];
            
            let expiryDate = null;
            for (const pattern of expiryPatterns) {
                const match = stdout.match(pattern);
                if (match) {
                    const dateStr = match[1].trim();
                    const parsedDate = new Date(dateStr);
                    if (!isNaN(parsedDate.getTime())) {
                        expiryDate = parsedDate;
                        break;
                    }
                }
            }
            
            resolve({
                domain: domainName,
                expiryDate: expiryDate ? expiryDate.toISOString() : null,
                dataLength: stdout.length,
                hasExpiry: !!expiryDate
            });
        });
    });
}

// 测试函数
async function testDomains() {
    const testDomains = [
        'viorobur.net',      // 之前失败的域名
        'masterakoh.com',    // 之前正常的域名
        'google.com'         // 稳定的测试域名
    ];

    console.log('=== 开始测试改进后的whois扫描 ===\n');
    
    for (const domain of testDomains) {
        console.log(`🔍 测试域名: ${domain}`);
        try {
            const startTime = Date.now();
            const result = await queryDomainImproved(domain);
            const duration = Date.now() - startTime;
            
            console.log(`✅ 成功 - 耗时: ${duration}ms`);
            console.log(`   到期日期: ${result.expiryDate || 'N/A'}`);
            console.log(`   数据长度: ${result.dataLength} bytes`);
            console.log(`   找到到期日期: ${result.hasExpiry ? '是' : '否'}`);
        } catch (error) {
            console.log(`❌ 失败: ${error.message}`);
        }
        console.log('---');
        
        // 每次测试之间等待一下，避免频率过高
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('=== 测试完成 ===');
}

// 运行测试
if (require.main === module) {
    testDomains()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('测试出错:', error);
            process.exit(1);
        });
}