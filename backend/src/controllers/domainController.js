const asyncHandler = require('express-async-handler');
const csvParser = require('csv-parser');
const csvStringify = require('csv-stringify');
const sanitizeHtml = require('sanitize-html');
const stream = require('stream');
const { promisify } = require('util');

const Domain = require('../models/domainModel');
const History = require('../models/historyModel');
const { evaluateRenewal } = require('../utils/renewalEvaluator');
const logger = require('../utils/logger');

// 辅助函数 - 记录历史
const logDomainHistory = async (actionType, domainName, domainId, details = {}, user = 'system', ipAddress = null) => {
  try {
    await History.create({
      domainName,
      domainId,
      actionType,
      user,
      details,
      ipAddress
    });
  } catch (error) {
    logger.error(`记录域名历史失败 (${actionType}, ${domainName}): ${error.message}`);
  }
};

// 辅助函数 - 清理用户输入
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return sanitizeHtml(input, {
    allowedTags: [], // 不允许任何HTML标签
    allowedAttributes: {}
  });
};

// @描述    获取域名列表 (支持分页、筛选、排序)
// @路由    GET /api/domains
// @访问    私有 (未来应添加认证)
const getDomains = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sort = 'domainName',
    order = 'asc',
    search,
    domainType,
    holder,
    businessUsage,
    icpStatus,
    renewalSuggestion,
    expiringDays
  } = req.query;

  // 构建查询条件
  const filter = {};

  if (search) {
    filter.$or = [
      { domainName: { $regex: search, $options: 'i' } },
      { holder: { $regex: search, $options: 'i' } },
      { businessUsage: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } }
    ];
  }

  if (domainType) filter.domainType = domainType;
  if (holder) filter.holder = { $regex: holder, $options: 'i' };
  if (businessUsage) filter.businessUsage = { $regex: businessUsage, $options: 'i' };
  if (icpStatus) filter.icpStatus = { $regex: icpStatus, $options: 'i' };
  if (renewalSuggestion) filter.renewalSuggestion = renewalSuggestion;

  // 根据到期天数筛选
  if (expiringDays) {
    const now = new Date();
    const daysLater = new Date(now.getTime() + parseInt(expiringDays) * 24 * 60 * 60 * 1000);
    filter.expiryDate = { $gte: now, $lte: daysLater };
  }

  // 构建排序选项
  const sortOption = {};
  sortOption[sort] = order === 'desc' ? -1 : 1;

  // 分页选项
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: sortOption,
    lean: true // 返回普通JavaScript对象而不是Mongoose文档，提高性能
  };

  const result = await Domain.paginate(filter, options);

  res.json({
    status: 'success',
    data: result.docs,
    pagination: {
      total: result.totalDocs,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage
    }
  });
});

// @描述    获取单个域名详情
// @路由    GET /api/domains/:id
// @访问    私有
const getDomain = asyncHandler(async (req, res) => {
  const domain = await Domain.findById(req.params.id);

  if (!domain) {
    res.status(404);
    throw new Error('域名未找到');
  }

  res.json({
    status: 'success',
    data: domain
  });
});

// @描述    创建新域名
// @路由    POST /api/domains
// @访问    私有
const createDomain = asyncHandler(async (req, res) => {
  // 清理用户输入
  const cleanData = {
    domainName: sanitizeInput(req.body.domainName),
    domainType: req.body.domainType,
    expiryDate: req.body.expiryDate,
    holder: sanitizeInput(req.body.holder),
    resolverAccount: sanitizeInput(req.body.resolverAccount),
    resolverProvider: sanitizeInput(req.body.resolverProvider),
    businessUsage: sanitizeInput(req.body.businessUsage),
    icpStatus: sanitizeInput(req.body.icpStatus),
    renewalPriceRaw: sanitizeInput(req.body.renewalPriceRaw),
    isMarkedForNoRenewal: Boolean(req.body.isMarkedForNoRenewal),
    hasSpecialValue: Boolean(req.body.hasSpecialValue),
    notes: sanitizeInput(req.body.notes)
  };

  // 评估续费建议
  const { suggestion, reason } = evaluateRenewal(cleanData);
  cleanData.renewalSuggestion = suggestion;
  cleanData.renewalSuggestionReason = reason;
  cleanData.lastEvaluatedAt = new Date();

  const domain = await Domain.create(cleanData);

  // 记录历史
  await logDomainHistory('CREATE', domain.domainName, domain._id, {
    domainData: cleanData
  }, req.user?.username || 'system', req.ip);

  logger.info(`域名 ${domain.domainName} 已创建`);

  res.status(201).json({
    status: 'success',
    data: domain
  });
});

// @描述    更新域名
// @路由    PUT /api/domains/:id
// @访问    私有
const updateDomain = asyncHandler(async (req, res) => {
  const domain = await Domain.findById(req.params.id);

  if (!domain) {
    res.status(404);
    throw new Error('域名未找到');
  }

  // 记录变更前的值
  const originalData = domain.toObject();

  // 清理用户输入
  const cleanData = {
    domainName: sanitizeInput(req.body.domainName),
    domainType: req.body.domainType,
    expiryDate: req.body.expiryDate,
    holder: sanitizeInput(req.body.holder),
    resolverAccount: sanitizeInput(req.body.resolverAccount),
    resolverProvider: sanitizeInput(req.body.resolverProvider),
    businessUsage: sanitizeInput(req.body.businessUsage),
    icpStatus: sanitizeInput(req.body.icpStatus),
    renewalPriceRaw: sanitizeInput(req.body.renewalPriceRaw),
    isMarkedForNoRenewal: Boolean(req.body.isMarkedForNoRenewal),
    hasSpecialValue: Boolean(req.body.hasSpecialValue),
    notes: sanitizeInput(req.body.notes)
  };

  // 重新评估续费建议
  const { suggestion, reason } = evaluateRenewal(cleanData);
  cleanData.renewalSuggestion = suggestion;
  cleanData.renewalSuggestionReason = reason;
  cleanData.lastEvaluatedAt = new Date();

  // 更新域名
  Object.assign(domain, cleanData);
  const updatedDomain = await domain.save();

  // 记录变更详情
  const changedFields = {};
  for (const [key, newValue] of Object.entries(cleanData)) {
    if (originalData[key] !== newValue) {
      changedFields[key] = {
        old: originalData[key],
        new: newValue
      };
    }
  }

  // 记录历史
  await logDomainHistory('UPDATE', domain.domainName, domain._id, {
    changedFields
  }, req.user?.username || 'system', req.ip);

  logger.info(`域名 ${domain.domainName} 已更新`);

  res.json({
    status: 'success',
    data: updatedDomain
  });
});

// @描述    删除域名
// @路由    DELETE /api/domains/:id
// @访问    私有
const deleteDomain = asyncHandler(async (req, res) => {
  const domain = await Domain.findById(req.params.id);

  if (!domain) {
    res.status(404);
    throw new Error('域名未找到');
  }

  const domainName = domain.domainName;
  await Domain.findByIdAndDelete(req.params.id);

  // 记录历史
  await logDomainHistory('DELETE', domainName, req.params.id, {
    deletedDomain: domain.toObject()
  }, req.user?.username || 'system', req.ip);

  logger.info(`域名 ${domainName} 已删除`);

  res.json({
    status: 'success',
    message: '域名已删除'
  });
});

// @描述    评估域名续费建议
// @路由    POST /api/domains/:id/evaluate-renewal
// @访问    私有
const evaluateDomainRenewal = asyncHandler(async (req, res) => {
  const domain = await Domain.findById(req.params.id);

  if (!domain) {
    res.status(404);
    throw new Error('域名未找到');
  }

  const originalSuggestion = domain.renewalSuggestion;
  const originalReason = domain.renewalSuggestionReason;

  // 评估续费建议
  const { suggestion, reason } = evaluateRenewal(domain.toObject());
  
  domain.renewalSuggestion = suggestion;
  domain.renewalSuggestionReason = reason;
  domain.lastEvaluatedAt = new Date();

  const updatedDomain = await domain.save();

  // 记录历史
  await logDomainHistory('RENEWAL_SUGGESTION_UPDATED', domain.domainName, domain._id, {
    oldSuggestion: originalSuggestion,
    oldReason: originalReason,
    newSuggestion: suggestion,
    newReason: reason
  }, req.user?.username || 'system', req.ip);

  logger.info(`域名 ${domain.domainName} 续费建议已更新: ${suggestion}`);

  res.json({
    status: 'success',
    data: updatedDomain
  });
});

// @描述    批量操作域名
// @路由    POST /api/domains/batch
// @访问    私有
const batchOperateDomains = asyncHandler(async (req, res) => {
  const { operation, ids, data } = req.body;

  if (!operation || !ids || !Array.isArray(ids)) {
    res.status(400);
    throw new Error('缺少必要参数：operation 和 ids');
  }

  const results = { success: 0, failed: 0, errors: [] };

  if (operation === 'delete') {
    for (const id of ids) {
      try {
        const domain = await Domain.findById(id);
        if (domain) {
          const domainName = domain.domainName;
          await Domain.findByIdAndDelete(id);
          await logDomainHistory('DELETE', domainName, id, {
            batchOperation: true
          }, req.user?.username || 'system', req.ip);
          results.success++;
          logger.info(`批量删除域名 ${domainName} 成功`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
      }
    }
  } else if (operation === 'evaluate') {
    for (const id of ids) {
      try {
        const domain = await Domain.findById(id);
        if (domain) {
          const originalSuggestion = domain.renewalSuggestion;
          const { suggestion, reason } = evaluateRenewal(domain.toObject());
          
          domain.renewalSuggestion = suggestion;
          domain.renewalSuggestionReason = reason;
          domain.lastEvaluatedAt = new Date();
          
          await domain.save();
          await logDomainHistory('RENEWAL_SUGGESTION_UPDATED', domain.domainName, domain._id, {
            batchOperation: true,
            oldSuggestion: originalSuggestion,
            newSuggestion: suggestion
          }, req.user?.username || 'system', req.ip);
          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
      }
    }
  } else {
    res.status(400);
    throw new Error('不支持的批量操作类型');
  }

  res.json({
    status: 'success',
    data: results
  });
});

// CSV字段映射
const csvFieldMapping = {
  '域名': 'domainName',
  '域名类型': 'domainType',
  '到期日期': 'expiryDate',
  '持有者': 'holder',
  '解析管理账号': 'resolverAccount',
  '解析管理方': 'resolverProvider',
  '业务使用情况': 'businessUsage',
  'ICP证': 'icpStatus',
  '年续费价': 'renewalPriceRaw',
  '标记为不续费': 'isMarkedForNoRenewal',
  '具有特殊价值': 'hasSpecialValue',
  '备注信息': 'notes'
};

// 辅助函数 - 转换布尔值
const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return ['true', '1', '是', 'yes', 'y'].includes(lower);
  }
  return false;
};

// @描述    从CSV导入域名
// @路由    POST /api/domains/import
// @访问    私有
const importDomainsFromCSV = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('请选择要上传的CSV文件');
  }

  const results = {
    total: 0,
    success: 0,
    updated: 0,
    failed: 0,
    errors: []
  };

  const csvData = req.file.buffer.toString('utf8');
  const domains = [];

  // 解析CSV
  const finished = promisify(stream.finished);
  const csvStream = new stream.Readable();
  csvStream.push(csvData);
  csvStream.push(null);

  try {
    await new Promise((resolve, reject) => {
      csvStream
        .pipe(csvParser())
        .on('data', (row) => {
          try {
            results.total++;
            
            // 映射字段
            const domainData = {};
            for (const [csvField, modelField] of Object.entries(csvFieldMapping)) {
              if (row[csvField] !== undefined && row[csvField] !== '') {
                let value = row[csvField];
                
                // 特殊字段处理
                if (modelField === 'expiryDate') {
                  value = new Date(value);
                  if (isNaN(value.getTime())) {
                    throw new Error(`无效的日期格式: ${row[csvField]}`);
                  }
                } else if (modelField === 'isMarkedForNoRenewal' || modelField === 'hasSpecialValue') {
                  value = parseBoolean(value);
                } else if (typeof value === 'string') {
                  value = sanitizeInput(value);
                }
                
                domainData[modelField] = value;
              }
            }

            if (!domainData.domainName) {
              throw new Error('域名字段不能为空');
            }

            if (!domainData.expiryDate) {
              throw new Error('到期日期字段不能为空');
            }

            // 设置默认值
            if (!domainData.domainType) domainData.domainType = 'gTLD';

            // 评估续费建议
            const { suggestion, reason } = evaluateRenewal(domainData);
            domainData.renewalSuggestion = suggestion;
            domainData.renewalSuggestionReason = reason;
            domainData.lastEvaluatedAt = new Date();

            domains.push(domainData);
          } catch (error) {
            results.failed++;
            results.errors.push({
              row: results.total,
              domainName: row['域名'] || 'Unknown',
              error: error.message
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // 批量处理域名
    for (const domainData of domains) {
      try {
        const existingDomain = await Domain.findOne({ domainName: domainData.domainName });
        
        if (existingDomain) {
          // 更新现有域名
          Object.assign(existingDomain, domainData);
          await existingDomain.save();
          results.updated++;
          
          await logDomainHistory('UPDATE', domainData.domainName, existingDomain._id, {
            importedData: domainData,
            isImport: true
          }, req.user?.username || 'system', req.ip);
        } else {
          // 创建新域名
          const newDomain = await Domain.create(domainData);
          results.success++;
          
          await logDomainHistory('CREATE', domainData.domainName, newDomain._id, {
            importedData: domainData,
            isImport: true
          }, req.user?.username || 'system', req.ip);
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          domainName: domainData.domainName,
          error: error.message
        });
      }
    }

    // 记录导入操作历史
    await logDomainHistory('IMPORT', null, null, {
      filename: req.file.originalname,
      stats: results
    }, req.user?.username || 'system', req.ip);

    logger.info(`CSV导入完成: ${results.success}个新增, ${results.updated}个更新, ${results.failed}个失败`);

    res.json({
      status: 'success',
      data: results
    });

  } catch (error) {
    logger.error(`CSV导入失败: ${error.message}`);
    throw new Error(`CSV文件解析失败: ${error.message}`);
  }
});

// @描述    导出域名为CSV
// @路由    GET /api/domains/export
// @访问    私有
const exportDomainsToCSV = asyncHandler(async (req, res) => {
  const domains = await Domain.find({}).lean();

  const csvHeaders = Object.keys(csvFieldMapping);
  const csvRows = domains.map(domain => {
    const row = {};
    for (const [csvField, modelField] of Object.entries(csvFieldMapping)) {
      let value = domain[modelField];
      
      // 特殊字段处理
      if (modelField === 'expiryDate' && value) {
        value = new Date(value).toISOString().split('T')[0]; // 格式化为 YYYY-MM-DD
      } else if (modelField === 'isMarkedForNoRenewal' || modelField === 'hasSpecialValue') {
        value = value ? '是' : '否';
      } else if (value === null || value === undefined) {
        value = '';
      }
      
      row[csvField] = value;
    }
    return row;
  });

  // 生成CSV
  csvStringify([csvHeaders, ...csvRows.map(row => csvHeaders.map(header => row[header]))], (err, output) => {
    if (err) {
      logger.error(`CSV导出失败: ${err.message}`);
      throw new Error('CSV导出失败');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `域名管理系统导出_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    // 添加BOM以确保Excel正确显示中文
    res.write('\uFEFF');
    res.send(output);

    logger.info(`CSV导出完成，共导出 ${domains.length} 个域名`);
  });
});

module.exports = {
  getDomains,
  getDomain,
  createDomain,
  updateDomain,
  deleteDomain,
  evaluateDomainRenewal,
  batchOperateDomains,
  importDomainsFromCSV,
  exportDomainsToCSV
};
