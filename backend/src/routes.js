const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const iconv = require('iconv-lite');
const pLimit = require('p-limit');
const { Domain, SSLCertificate, ScanTask, AlertConfig, EvaluationConfig } = require('./models');
const { scanDomainExpiry, logScan } = require('./domainScanner');
const { checkSSLCertificate, logSSL } = require('./sslChecker');
const { checkAndSendAlerts, testAlertWebhook } = require('./alertService');
const { evaluateRenewal, evaluateAllDomains, evaluateSSLStatus, evaluateAllSSLCertificates, getEvaluationConfig } = require('./evaluationService');

const router = express.Router();
const upload = multer({ 
  dest: '/tmp/', 
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('只支持CSV文件'));
    }
  }
});

// 智能CSV解析函数
function parseCSVLine(line, delimiter = ',') {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  
  return result;
}

// 批量扫描域名函数 - 修复版本
async function batchScanDomains(taskId) {
  logScan(`开始执行批量域名扫描任务: ${taskId}`);
  
  try {
    const task = await ScanTask.findOne({ taskId });
    if (!task) {
      logScan(`任务不存在: ${taskId}`, 'error');
      return;
    }
    
    // 更新任务状态为运行中
    task.status = 'running';
    task.startTime = new Date();
    await task.save();
    
    // 获取所有需要扫描的域名
    const domains = await Domain.find({}).select('domainName expiryDate');
    task.totalItems = domains.length;
    await task.save();
    
    logScan(`共找到 ${domains.length} 个域名需要扫描`);
    
    if (domains.length === 0) {
      task.status = 'completed';
      task.endTime = new Date();
      await task.save();
      logScan('没有域名需要扫描，任务完成');
      return;
    }
    
    // 创建并发限制
    const batchSize = parseInt(process.env.SCAN_BATCH_SIZE) || 5;
    const limit = pLimit(batchSize);
    logScan(`使用并发数: ${batchSize}`);
    
    // 批量扫描域名
    const scanPromises = domains.map(domain => 
      limit(async () => {
        try {
          logScan(`开始扫描域名: ${domain.domainName}`);
          
          // 调用域名扫描函数，不是SSL扫描
          const scanResult = await scanDomainExpiry(domain.domainName);
          
          // 更新域名信息
          await Domain.findByIdAndUpdate(domain._id, {
            expiryDate: scanResult.expiryDate,
            registrar: scanResult.registrar,
            nameServers: scanResult.nameServers,
            lastScanned: new Date(),
            scanStatus: 'success',
            scanError: null,
            autoScanned: true
          });
          
          task.scannedItems = (task.scannedItems || 0) + 1;
          task.successCount = (task.successCount || 0) + 1;
          
          logScan(`域名 ${domain.domainName} 扫描成功`);
          
          // 每扫描5个域名保存一次进度
          if (task.scannedItems % 5 === 0) {
            await task.save();
          }
          
        } catch (error) {
          logScan(`域名 ${domain.domainName} 扫描失败: ${error.message}`, 'error');
          
          // 对于扫描失败的域名，只更新扫描状态，不修改到期日期
          await Domain.findByIdAndUpdate(domain._id, {
            lastScanned: new Date(),
            scanStatus: 'failed',
            scanError: error.message
            // 注意：不更新 expiryDate，保持原有值
          });
          
          task.scannedItems = (task.scannedItems || 0) + 1;
          task.failureCount = (task.failureCount || 0) + 1;
          
          if (!task.errors) {
            task.errors = [];
          }
          task.errors.push({
            item: domain.domainName,
            error: error.message
          });
          
          // 每处理5个域名保存一次进度
          if (task.scannedItems % 5 === 0) {
            await task.save();
          }
        }
      })
    );
    
    // 等待所有扫描完成
    await Promise.all(scanPromises);
    
    // 更新任务完成状态
    task.status = 'completed';
    task.endTime = new Date();
    await task.save();
    
    logScan(`批量域名扫描任务 ${taskId} 完成。成功: ${task.successCount}，失败: ${task.failureCount}`);
    
    // 更新所有域名的续费建议
    try {
      const allDomains = await Domain.find();
      await evaluateAllDomains(allDomains);
      logScan('域名续费建议更新完成');
    } catch (evalError) {
      logScan(`续费建议更新失败: ${evalError.message}`, 'error');
    }
    
  } catch (error) {
    logScan(`批量域名扫描任务 ${taskId} 执行异常: ${error.message}`, 'error');
    
    try {
      const task = await ScanTask.findOne({ taskId });
      if (task) {
        task.status = 'failed';
        task.endTime = new Date();
        if (!task.errors) {
          task.errors = [];
        }
        task.errors.push({
          item: 'system',
          error: error.message
        });
        await task.save();
      }
    } catch (saveError) {
      logScan(`保存任务失败状态时出错: ${saveError.message}`, 'error');
    }
  }
}

// 批量扫描SSL证书
async function batchScanSSLCertificates(taskId) {
  logSSL(`开始执行批量SSL证书扫描任务: ${taskId}`);
  
  try {
    const task = await ScanTask.findOne({ taskId });
    if (!task) {
      logSSL(`任务不存在: ${taskId}`, 'error');
      return;
    }
    
    // 更新任务状态为运行中
    task.status = 'running';
    task.startTime = new Date();
    await task.save();
    
    // 获取所有需要扫描的证书
    const certificates = await SSLCertificate.find({}).select('domain');
    task.totalItems = certificates.length;
    await task.save();
    
    logSSL(`共找到 ${certificates.length} 个SSL证书需要扫描`);
    
    if (certificates.length === 0) {
      task.status = 'completed';
      task.endTime = new Date();
      await task.save();
      logSSL('没有SSL证书需要扫描，任务完成');
      return;
    }
    
    // 创建并发限制
    const batchSize = parseInt(process.env.SSL_SCAN_BATCH_SIZE) || 3;
    const limit = pLimit(batchSize);
    logSSL(`使用并发数: ${batchSize}`);
    
    // 批量扫描
    const scanPromises = certificates.map(cert => 
      limit(async () => {
        try {
          logSSL(`开始扫描SSL证书: ${cert.domain}`);
          
          // 完全复制导入txt的逻辑
          const sslInfo = await checkSSLCertificate(cert.domain);
          
          // 统一处理保存逻辑 - 完全复制导入txt的代码
          if (sslInfo.status === 'error') {
            // 错误状态特殊处理
            await SSLCertificate.findByIdAndUpdate(cert._id, {
              domain: cert.domain,
              lastChecked: new Date(),
              status: 'error',
              checkError: sslInfo.checkError,
              accessible: false,
              daysRemaining: -1,
              validTo: null,
              validFrom: null
            });
          } else {
            // 正常状态保存
            await SSLCertificate.findByIdAndUpdate(cert._id, {
              ...sslInfo,
              lastChecked: new Date(),
              checkError: null
            });
          }
          
          task.scannedItems = (task.scannedItems || 0) + 1;
          task.successCount = (task.successCount || 0) + 1;
          
          logSSL(`SSL证书 ${cert.domain} 扫描成功，状态: ${sslInfo.status}`);
          
          // 每扫描5个证书保存一次进度
          if (task.scannedItems % 5 === 0) {
            await task.save();
          }
          
        } catch (error) {
          logSSL(`SSL证书 ${cert.domain} 扫描异常: ${error.message}`, 'error');
          
          // 更新证书扫描状态为错误 - 也复制导入txt的逻辑
          await SSLCertificate.findByIdAndUpdate(cert._id, {
            domain: cert.domain,
            lastChecked: new Date(),
            status: 'error',
            checkError: error.message,
            accessible: false,
            daysRemaining: -1,
            validTo: null,
            validFrom: null
          });
          
          task.scannedItems = (task.scannedItems || 0) + 1;
          task.failureCount = (task.failureCount || 0) + 1;
          
          if (!task.errors) {
            task.errors = [];
          }
          task.errors.push({
            item: cert.domain,
            error: error.message
          });
          
          // 每处理5个证书保存一次进度
          if (task.scannedItems % 5 === 0) {
            await task.save();
          }
        }
      })
    );
    
    // 等待所有扫描完成
    await Promise.all(scanPromises);
    
    // 更新任务完成状态
    task.status = 'completed';
    task.endTime = new Date();
    await task.save();
    
    logSSL(`批量SSL证书扫描任务 ${taskId} 完成。成功: ${task.successCount}，失败: ${task.failureCount}`);
    
    // 更新所有证书的状态
    try {
      const allCertificates = await SSLCertificate.find();
      await evaluateAllSSLCertificates(allCertificates);
      logSSL('SSL证书状态评估更新完成');
    } catch (evalError) {
      logSSL(`SSL证书状态评估更新失败: ${evalError.message}`, 'error');
    }
    
  } catch (error) {
    logSSL(`批量SSL证书扫描任务 ${taskId} 执行异常: ${error.message}`, 'error');
    
    try {
      const task = await ScanTask.findOne({ taskId });
      if (task) {
        task.status = 'failed';
        task.endTime = new Date();
        if (!task.errors) {
          task.errors = [];
        }
        task.errors.push({
          item: 'system',
          error: error.message
        });
        await task.save();
      }
    } catch (saveError) {
      logSSL(`保存任务失败状态时出错: ${saveError.message}`, 'error');
    }
  }
}

// 域名相关路由
router.get('/domains', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, expiringDays, renewalSuggestion, scanStatus, hasICP, domainType } = req.query;
    const filter = {};
    
    if (search) {
      filter.$or = [
        { domainName: new RegExp(search, 'i') },
        { holder: new RegExp(search, 'i') }
      ];
    }
    
    if (expiringDays) {
      const days = parseInt(expiringDays);
      filter.expiryDate = {
        $gte: new Date(),
        $lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      };
    }
    
    if (renewalSuggestion) {
      filter.renewalSuggestion = renewalSuggestion;
    }
    
    if (scanStatus) {
      filter.scanStatus = scanStatus;
    }
    
    // 修复hasICP筛选
    if (hasICP !== undefined && hasICP !== '') {
      filter.hasICP = hasICP === 'true';
    }
    
    // 修复domainType筛选
    if (domainType && domainType !== '') {
      filter.domainType = domainType;
    }
    
    const total = await Domain.countDocuments(filter);
    const domains = await Domain.find(filter)
      .sort({ expiryDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    res.json({
      data: domains,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/domains', async (req, res) => {
  try {
    const domainData = req.body;
    domainData.renewalSuggestion = await evaluateRenewal(domainData);
    domainData.scanStatus = 'pending';
    const domain = new Domain(domainData);
    await domain.save();
    res.status(201).json(domain);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/domains/:id', async (req, res) => {
  try {
    const domainData = req.body;
    domainData.renewalSuggestion = await evaluateRenewal(domainData);
    const domain = await Domain.findByIdAndUpdate(
      req.params.id,
      domainData,
      { new: true, runValidators: true }
    );
    res.json(domain);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/domains/:id', async (req, res) => {
  try {
    await Domain.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// CSV导入
router.post('/domains/import', upload.single('file'), async (req, res) => {
  console.log('========== 开始CSV导入 ==========');
  const results = { 
    total: 0,
    success: 0, 
    updated: 0,
    failed: 0, 
    errors: [],
    details: []
  };
  
  try {
    if (!req.file) {
      throw new Error('没有上传文件');
    }
    
    const tempFilePath = req.file.path;
    console.log('上传文件:', req.file.originalname);
    
    // 读取原始文件buffer
    const fileBuffer = fs.readFileSync(tempFilePath);
    let fileContent;
    
    // 尝试多种编码
    if (fileBuffer[0] === 0xEF && fileBuffer[1] === 0xBB && fileBuffer[2] === 0xBF) {
      fileContent = fileBuffer.toString('utf-8').substring(1);
      console.log('检测到UTF-8 BOM编码');
    } else {
      fileContent = fileBuffer.toString('utf-8');
      
      if (fileContent.includes('�') || fileContent.includes('锘')) {
        try {
          fileContent = iconv.decode(fileBuffer, 'gbk');
          console.log('使用GBK编码');
        } catch (e) {
          console.log('GBK解码失败，使用UTF-8');
        }
      } else {
        console.log('使用UTF-8编码');
      }
    }
    
    // 规范化换行符
    fileContent = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // 检测分隔符
    const firstLine = fileContent.split('\n')[0] || '';
    let delimiter = ',';
    
    const delimiterCounts = {
      ',': (firstLine.match(/,/g) || []).length,
      ';': (firstLine.match(/;/g) || []).length,
      '\t': (firstLine.match(/\t/g) || []).length,
      '|': (firstLine.match(/\|/g) || []).length
    };
    
    let maxCount = 0;
    for (const [delim, count] of Object.entries(delimiterCounts)) {
      if (count > maxCount) {
        maxCount = count;
        delimiter = delim;
      }
    }
    
    console.log('检测到分隔符:', delimiter === '\t' ? '\\t' : delimiter, '出现次数:', maxCount);
    
    // 分割行
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV文件至少需要包含表头和一行数据');
    }
    
    // 解析表头
    const headers = parseCSVLine(lines[0], delimiter);
    console.log('原始表头:', headers);
    
    const cleanHeaders = headers.map(h => h.replace(/^["']|["']$/g, '').trim());
    console.log('清理后表头:', cleanHeaders);
    
    // 构建字段索引映射
    const fieldMap = {};
    
    cleanHeaders.forEach((header, index) => {
      const normalized = header.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
      
      if (normalized === '域名' || normalized === 'domain' || normalized === 'domainname' || 
          normalized === '域名名称' || normalized === 'name' || header === '域名') {
        fieldMap.domainName = index;
      }
      else if (normalized === '域名类型' || normalized === 'domaintype' || normalized === 'type' || 
               normalized === '类型' || header === '域名类型') {
        fieldMap.domainType = index;
      }
      else if (normalized === '到期日期' || normalized === 'expirydate' || normalized === 'expiry' || 
               normalized === '到期时间' || normalized === '有效期' || header === '到期日期') {
        fieldMap.expiryDate = index;
      }
      else if (normalized === '持有者' || normalized === 'holder' || normalized === 'owner' || 
               normalized === '所有者' || normalized === '公司' || header === '持有者') {
        fieldMap.holder = index;
      }
      else if (normalized === '业务使用' || normalized === 'businessusage' || normalized === 'usage' || 
               normalized === '使用情况' || normalized === '用途' || header === '业务使用') {
        fieldMap.businessUsage = index;
      }
      else if (normalized === 'icp证' || normalized === 'icpstatus' || normalized === 'icp' || 
               normalized === '备案' || normalized === '备案号' || header === 'ICP证') {
        fieldMap.hasICP = index;
      }
      else if (normalized === '续费价格' || normalized === 'renewalprice' || normalized === 'price' || 
               normalized === '价格' || normalized === '年费' || header === '续费价格') {
        fieldMap.renewalPrice = index;
      }
      else if (normalized === '备注' || normalized === 'notes' || normalized === 'note' || 
               normalized === '说明' || normalized === '备注信息' || header === '备注') {
        fieldMap.notes = index;
      }
    });
    
    console.log('字段映射:', fieldMap);
    console.log('找到的字段:', Object.keys(fieldMap).filter(k => fieldMap[k] !== undefined));
    
    // 验证必要字段
    if (fieldMap.domainName === undefined) {
      console.error('无法找到域名列，表头:', cleanHeaders);
      throw new Error('找不到域名列。请确保CSV包含"域名"列。当前表头: ' + cleanHeaders.join(', '));
    }
    if (fieldMap.expiryDate === undefined) {
      console.error('无法找到到期日期列，表头:', cleanHeaders);
      throw new Error('找不到到期日期列。请确保CSV包含"到期日期"列。');
    }
    
    // 处理数据行
    const domainList = [];
    
    for (let lineNum = 1; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      if (!line.trim()) continue;
      
      results.total++;
      
      try {
        const values = parseCSVLine(line, delimiter);
        const domainData = {};
        
        if (fieldMap.domainName !== undefined && values[fieldMap.domainName]) {
          domainData.domainName = values[fieldMap.domainName].toLowerCase().trim();
        } else {
          throw new Error('域名为空');
        }
        
        if (fieldMap.expiryDate !== undefined && values[fieldMap.expiryDate]) {
          const dateStr = values[fieldMap.expiryDate].trim();
          
          let date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            const formats = [
              dateStr.replace(/[\/\.]/g, '-'),
              dateStr.replace(/年|月/g, '-').replace(/日/g, ''),
              dateStr.split('/').reverse().join('-'),
              dateStr.split('.').reverse().join('-')
            ];
            
            for (const format of formats) {
              date = new Date(format);
              if (!isNaN(date.getTime())) {
                break;
              }
            }
            
            if (isNaN(date.getTime())) {
              throw new Error(`无效的日期格式: ${dateStr}`);
            }
          }
          domainData.expiryDate = date;
        } else {
          throw new Error('到期日期为空');
        }
        
        if (fieldMap.domainType !== undefined && values[fieldMap.domainType]) {
          domainData.domainType = values[fieldMap.domainType].trim();
        } else {
          domainData.domainType = 'gTLD';
        }
        
        if (fieldMap.holder !== undefined && values[fieldMap.holder]) {
          domainData.holder = values[fieldMap.holder].trim();
        }
        
        if (fieldMap.businessUsage !== undefined && values[fieldMap.businessUsage]) {
          domainData.businessUsage = values[fieldMap.businessUsage].trim();
        }
        
        if (fieldMap.hasICP !== undefined && values[fieldMap.hasICP]) {
          domainData.icpStatus = values[fieldMap.hasICP].trim();
        }
        
        if (fieldMap.renewalPrice !== undefined && values[fieldMap.renewalPrice]) {
          domainData.renewalPrice = values[fieldMap.renewalPrice].trim();
        }
        
        if (fieldMap.notes !== undefined && values[fieldMap.notes]) {
          domainData.notes = values[fieldMap.notes].trim();
        }
        
        // 新导入的域名默认为待扫描
        domainData.scanStatus = 'pending';
        
        console.log(`第${lineNum}行解析结果:`, domainData);
        domainList.push(domainData);
        
      } catch (error) {
        console.error(`第${lineNum}行解析失败:`, error.message);
        results.failed++;
        results.errors.push({
          row: lineNum,
          content: line.substring(0, 100),
          error: error.message
        });
      }
    }
    
    console.log(`共解析${domainList.length}个域名，开始保存到数据库`);
    
    // 保存到数据库
    for (const domainData of domainList) {
      try {
        domainData.renewalSuggestion = await evaluateRenewal(domainData);
        
        const existing = await Domain.findOne({ domainName: domainData.domainName });
        
        if (existing) {
          await Domain.findOneAndUpdate(
            { domainName: domainData.domainName },
            domainData,
            { new: true }
          );
          results.updated++;
          results.details.push({
            domainName: domainData.domainName,
            action: 'updated'
          });
        } else {
          await Domain.create(domainData);
          results.success++;
          results.details.push({
            domainName: domainData.domainName,
            action: 'created'
          });
        }
        
      } catch (error) {
        console.error(`保存域名${domainData.domainName}失败:`, error.message);
        results.failed++;
        results.errors.push({
          domain: domainData.domainName,
          error: error.message
        });
      }
    }
    
    // 清理临时文件
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    console.log('========== CSV导入完成 ==========');
    console.log(`总计: ${results.total}, 新增: ${results.success}, 更新: ${results.updated}, 失败: ${results.failed}`);
    
    res.json({
      success: true,
      message: `导入完成：新增 ${results.success} 个，更新 ${results.updated} 个，失败 ${results.failed} 个`,
      ...results
    });
    
  } catch (error) {
    console.error('CSV导入失败:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(400).json({ 
      success: false,
      error: error.message,
      ...results
    });
  }
});

// CSV导出
router.get('/domains/export', async (req, res) => {
  try {
    const domains = await Domain.find().sort({ domainName: 1 }).lean();
    
    let csvContent = '\uFEFF';
    
    const headers = ['域名', '域名类型', '到期日期', '持有者', '业务使用', 'ICP证', '续费价格', '续费建议', '备注', '最后扫描时间', '扫描状态'];
    csvContent += headers.join(',') + '\n';
    
    domains.forEach(domain => {
      const row = [
        domain.domainName || '',
        domain.domainType || '',
        domain.expiryDate ? dayjs(domain.expiryDate).format('YYYY-MM-DD') : '',
        domain.holder || '',
        domain.businessUsage || '',
        domain.hasICP ? '是' : '否',
        domain.renewalPrice || '',
        domain.renewalSuggestion || '',
        domain.notes || '',
        domain.lastScanned ? dayjs(domain.lastScanned).format('YYYY-MM-DD HH:mm:ss') : '',
        domain.scanStatus || ''
      ];
      
      const processedRow = row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      });
      
      csvContent += processedRow.join(',') + '\n';
    });
    
    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const filename = `domains_export_${timestamp}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
    
    console.log(`导出CSV成功，共 ${domains.length} 条记录`);
  } catch (error) {
    console.error('CSV导出错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// SSL证书相关路由
router.get('/ssl/certificates', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const filter = {};
    
    if (search) {
      filter.domain = new RegExp(search, 'i');
    }
    
    if (status) {
      filter.status = status;
    }
    
    const total = await SSLCertificate.countDocuments(filter);
    const certificates = await SSLCertificate.find(filter)
      .sort({ validTo: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    res.json({
      data: certificates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ssl/certificates', async (req, res) => {
  try {
    const certData = req.body;
    certData.status = await evaluateSSLStatus(certData);
    const certificate = new SSLCertificate(certData);
    await certificate.save();
    res.status(201).json(certificate);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/ssl/certificates/:id', async (req, res) => {
  try {
    const certData = req.body;
    certData.status = await evaluateSSLStatus(certData);
    const certificate = await SSLCertificate.findByIdAndUpdate(
      req.params.id,
      certData,
      { new: true, runValidators: true }
    );
    res.json(certificate);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/ssl/certificates/:id', async (req, res) => {
  try {
    await SSLCertificate.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// SSL证书导入（TXT格式）
// 单个SSL证书扫描接口 - 添加到routes.js的SSL证书相关路由部分
router.post('/ssl/scan-single', async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: '请提供域名' });
    }
    
    logSSL(`开始单个SSL证书扫描: ${domain}`);
    
    try {
      const scanResult = await checkSSLCertificate(domain);
      
      // 更新或创建证书记录
      const updatedCert = await SSLCertificate.findOneAndUpdate(
        { domain },
        {
          ...scanResult,
          lastChecked: new Date(),
          checkError: scanResult.status === 'error' ? scanResult.checkError : null
        },
        { 
          new: true, 
          upsert: true, 
          runValidators: true 
        }
      );
      
      logSSL(`SSL证书 ${domain} 扫描完成，状态: ${scanResult.status}`);
      
      res.json({
        success: true,
        message: '扫描完成',
        certificate: updatedCert
      });
      
    } catch (scanError) {
      // 扫描失败时也要更新记录，标记为错误状态
      const errorCert = await SSLCertificate.findOneAndUpdate(
        { domain },
        {
          domain,
          lastChecked: new Date(),
          status: 'error',
          checkError: scanError.message,
          accessible: false,
          daysRemaining: -1
        },
        { 
          new: true, 
          upsert: true, 
          runValidators: true 
        }
      );
      
      logSSL(`SSL证书 ${domain} 扫描失败: ${scanError.message}`, 'error');
      
      res.json({
        success: false,
        message: `扫描失败: ${scanError.message}`,
        certificate: errorCert
      });
    }
    
  } catch (error) {
    logSSL(`单个SSL扫描接口错误: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});
router.post('/ssl/import', async (req, res) => {
  try {
    const { domains } = req.body;
    const results = { success: 0, failed: 0, errors: [] };
    
    if (!Array.isArray(domains) || domains.length === 0) {
      return res.status(400).json({ error: '请提供域名列表' });
    }
    
    for (const domain of domains) {
      try {
        // 检查SSL证书信息
        const sslInfo = await checkSSLCertificate(domain);
        
        // 统一处理保存逻辑
        if (sslInfo.status === 'error') {
          // 错误状态特殊处理
          await SSLCertificate.findOneAndUpdate(
            { domain },
            {
              domain,
              lastChecked: new Date(),
              status: 'error',
              checkError: sslInfo.checkError,
              accessible: false,
              daysRemaining: -1,
              validTo: null,
              validFrom: null
            },
            { upsert: true }
          );
        } else {
          // 正常状态保存
          await SSLCertificate.findOneAndUpdate(
            { domain },
            {
              ...sslInfo,
              lastChecked: new Date(),
              checkError: null
            },
            { upsert: true }
          );
        }
        
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ domain, error: error.message });
      }
    }
    
    res.json({
      message: `导入完成：成功 ${results.success} 个，失败 ${results.failed} 个`,
      ...results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SSL证书导出（TXT格式）
router.get('/ssl/export', async (req, res) => {
  try {
    const certificates = await SSLCertificate.find()
      .sort({ domain: 1 })
      .select('domain');
    
    const domainList = certificates.map(cert => cert.domain).join('\n');
    
    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const filename = `ssl_domains_${timestamp}.txt`;
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(domainList);
    
    console.log(`导出SSL域名列表成功，共 ${certificates.length} 条记录`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 扫描相关路由
router.post('/scan/domains', async (req, res) => {
  try {
    const { domainIds } = req.body;
    
    // 创建扫描任务
    const taskId = `domain_manual_${Date.now()}`;
    const task = new ScanTask({
      taskId,
      taskType: 'domain',
      triggeredBy: 'manual'
    });
    await task.save();
    
    // 异步执行扫描
    batchScanDomains(taskId).catch(error => {
      logScan(`手动扫描任务失败: ${error.message}`, 'error');
    });
    
    res.json({ 
      message: '域名扫描任务已启动',
      taskId,
      status: 'started'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/scan/ssl', async (req, res) => {
  try {
    // 创建扫描任务
    const taskId = `ssl_manual_${Date.now()}`;
    const task = new ScanTask({
      taskId,
      taskType: 'ssl',
      triggeredBy: 'manual'
    });
    await task.save();
    
    // 异步执行扫描
    batchScanSSLCertificates(taskId).catch(error => {
      logSSL(`手动SSL扫描任务失败: ${error.message}`, 'error');
    });
    
    res.json({ 
      message: 'SSL扫描任务已启动',
      taskId,
      status: 'started'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/scan-tasks/:taskId', async (req, res) => {
  try {
    const task = await ScanTask.findOne({ taskId: req.params.taskId });
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    
    res.json({
      taskId: task.taskId,
      taskType: task.taskType,
      status: task.status,
      progress: {
        total: task.totalItems || 0,
        scanned: task.scannedItems,
        success: task.successCount,
        failed: task.failureCount,
        percentage: task.totalItems ? Math.round((task.scannedItems / task.totalItems) * 100) : 0
      },
      startTime: task.startTime,
      endTime: task.endTime,
      errors: task.errors ? task.errors.slice(0, 10) : [] // 只返回前10个错误
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/scan-history', async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const filter = {};
    
    if (type) {
      filter.taskType = type;
    }
    
    const total = await ScanTask.countDocuments(filter);
    const tasks = await ScanTask.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('taskId taskType status totalItems successCount failureCount startTime endTime triggeredBy createdAt');
    
    res.json({
      data: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 评估相关路由
router.post('/evaluate/domains', async (req, res) => {
  try {
    const domains = await Domain.find();
    const results = await evaluateAllDomains(domains);
    
    res.json({ 
      message: `已更新${results.length}个域名的续费建议`,
      results 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/evaluate/ssl', async (req, res) => {
  try {
    const certificates = await SSLCertificate.find();
    const results = await evaluateAllSSLCertificates(certificates);
    
    res.json({ 
      message: `已更新${results.length}个SSL证书的状态`,
      results 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/evaluation/config', async (req, res) => {
  try {
    const config = await getEvaluationConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/evaluation/config', async (req, res) => {
  try {
    let config = await EvaluationConfig.findOne();
    if (!config) {
      config = new EvaluationConfig(req.body);
    } else {
      Object.assign(config, req.body);
    }
    await config.save();
    res.json(config);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 告警相关路由
router.get('/alert-configs', async (req, res) => {
  try {
    const configs = await AlertConfig.find().sort({ createdAt: -1 });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/alert-configs', async (req, res) => {
  try {
    const config = new AlertConfig(req.body);
    await config.save();
    res.status(201).json(config);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/alert-configs/:id', async (req, res) => {
  try {
    const config = await AlertConfig.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json(config);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/alert-configs/:id', async (req, res) => {
  try {
    await AlertConfig.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/alert-configs/test', async (req, res) => {
  try {
    const { type, webhook } = req.body;
    const result = await testAlertWebhook(type, webhook);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/alerts/send', async (req, res) => {
  try {
    await checkAndSendAlerts();
    res.json({ message: '告警已发送' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 统计数据
router.get('/stats', async (req, res) => {
  try {
    // 域名统计
    const domainTotal = await Domain.countDocuments();
    
    // 7天内到期
    const domainUrgentExpiring = await Domain.countDocuments({
      expiryDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    
    // 30天内到期
    const domainExpiringSoon = await Domain.countDocuments({
      expiryDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    
    const domainByRenewalSuggestion = await Domain.aggregate([
      { $group: { _id: '$renewalSuggestion', count: { $sum: 1 } } }
    ]);
    
    const domainByType = await Domain.aggregate([
      { $group: { _id: '$domainType', count: { $sum: 1 } } }
    ]);
    
    const domainByScanStatus = await Domain.aggregate([
      { $group: { _id: '$scanStatus', count: { $sum: 1 } } }
    ]);
    
    // SSL证书统计
    const sslTotal = await SSLCertificate.countDocuments();
    
    const sslByStatus = await SSLCertificate.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // 最近的扫描任务
    const lastDomainScan = await ScanTask.findOne({ 
      taskType: 'domain',
      status: 'completed' 
    })
      .sort({ endTime: -1 })
      .select('taskId endTime successCount failureCount');
    
    const lastSSLScan = await ScanTask.findOne({ 
      taskType: 'ssl',
      status: 'completed' 
    })
      .sort({ endTime: -1 })
      .select('taskId endTime successCount failureCount');
    
    // 获取告警配置数量
    const alertConfigCount = await AlertConfig.countDocuments({ enabled: true });
    
    res.json({
      domain: {
        total: domainTotal,
        urgentExpiring: domainUrgentExpiring,
        expiringSoon: domainExpiringSoon,
        byRenewalSuggestion: domainByRenewalSuggestion,
        byType: domainByType,
        byScanStatus: domainByScanStatus,
        lastScan: lastDomainScan
      },
      ssl: {
        total: sslTotal,
        byStatus: sslByStatus,
        lastScan: lastSSLScan
      },
      alertConfigCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 仪表盘概览数据
router.get('/dashboard/overview', async (req, res) => {
  try {
    // 域名统计
    const domainTotal = await Domain.countDocuments();
    const domainExpiring30Days = await Domain.countDocuments({
      expiryDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    
    // SSL证书统计
    const sslTotal = await SSLCertificate.countDocuments();
    const sslCritical = await SSLCertificate.countDocuments({ status: 'critical' });
    
    // 待处理告警数
    const pendingAlerts = domainExpiring30Days + sslCritical;
    
    // 月度续费预算（示例数据）
    const monthlyBudget = await Domain.aggregate([
      {
        $match: {
          expiryDate: {
            $gte: new Date(),
            $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { 
            $sum: {
              $toDouble: {
                $replaceAll: {
                  input: { $replaceAll: { input: '$renewalPrice', find: '元/年', replacement: '' } },
                  find: '元',
                  replacement: ''
                }
              }
            }
          }
        }
      }
    ]);
    
    res.json({
      domainTotal,
      domainExpiring30Days,
      sslTotal,
      sslCritical,
      pendingAlerts,
      monthlyBudget: monthlyBudget[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 测试域名扫描
router.post('/test-domain-scan', async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: '请提供域名' });
    }
    
    const result = await scanDomainExpiry(domain);
    
    res.json({
      success: true,
      domain,
      ...result,
      expiryDateFormatted: dayjs(result.expiryDate).format('YYYY-MM-DD HH:mm:ss')
    });
    
  } catch (error) {
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

// 测试SSL证书扫描
router.post('/test-ssl-scan', async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: '请提供域名' });
    }
    
    const result = await checkSSLCertificate(domain);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

// 健康检查
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mongodb: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date(),
    domainScanEnabled: process.env.SCAN_ENABLED === 'true',
    sslScanEnabled: process.env.SSL_SCAN_ENABLED === 'true',
    alertEnabled: process.env.ALERT_ENABLED === 'true',
    version: '3.0.0'
  });
});

// 正确导出路由器和批量扫描函数
module.exports = router;
module.exports.batchScanDomains = batchScanDomains;
module.exports.batchScanSSLCertificates = batchScanSSLCertificates;
