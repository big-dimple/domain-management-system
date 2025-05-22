#!/bin/bash

# 域名管理系统 - 后端数据模型与业务逻辑控制器脚本
# 此脚本负责创建Mongoose数据模型以及处理业务逻辑的控制器。

# 彩色输出函数
print_green() {
    echo -e "\e[32m$1\e[0m" # 绿色输出
}

print_yellow() {
    echo -e "\e[33m$1\e[0m" # 黄色输出
}

print_red() {
    echo -e "\e[31m$1\e[0m" # 红色输出
}

print_blue() {
    echo -e "\e[34m$1\e[0m" # 蓝色输出
}

# 读取配置
# PROJECT_DIR 将从此文件加载
if [ -f /tmp/domain-management-system/config ]; then
    source /tmp/domain-management-system/config
else
    print_red "错误：找不到配置文件 /tmp/domain-management-system/config。"
    print_red "请确保已先运行初始化脚本 (02_initialize_project.sh)。"
    exit 1
fi

# 检查 PROJECT_DIR 是否已设置
if [ -z "$PROJECT_DIR" ]; then
    print_red "错误：项目目录 (PROJECT_DIR) 未在配置文件中设置。"
    exit 1
fi

# 显示脚本信息
print_blue "========================================"
print_blue "    域名管理系统 - 后端模型与业务逻辑脚本"
print_blue "========================================"
print_yellow "此脚本将创建以下后端文件:"
echo "1. 数据模型:"
echo "   - 域名模型 (./backend/src/models/domainModel.js)"
echo "   - 历史记录模型 (./backend/src/models/historyModel.js)"
echo "   - 系统配置模型 (./backend/src/models/systemModel.js) - 用于续费标准等"
echo "2. 控制器 (业务逻辑):"
echo "   - 域名控制器 (./backend/src/controllers/domainController.js)"
echo "   - 历史记录控制器 (./backend/src/controllers/historyController.js)"
echo "   - 系统控制器 (./backend/src/controllers/systemController.js)"
echo "   - 仪表盘控制器 (./backend/src/controllers/dashboardController.js)"
echo "3. 路由定义:"
echo "   - 域名路由 (./backend/src/routes/domainRoutes.js)"
echo "   - 历史记录路由 (./backend/src/routes/historyRoutes.js)"
echo "   - 系统路由 (./backend/src/routes/systemRoutes.js)"
echo "   - 仪表盘路由 (./backend/src/routes/dashboardRoutes.js)"


mkdir -p "$PROJECT_DIR/backend/src/models"
mkdir -p "$PROJECT_DIR/backend/src/controllers"
mkdir -p "$PROJECT_DIR/backend/src/routes"


print_green "创建域名模型 (./backend/src/models/domainModel.js)..."
cat > "$PROJECT_DIR/backend/src/models/domainModel.js" << 'EOF'
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const domainSchema = new mongoose.Schema({
  domainName: { // 域名
    type: String,
    required: [true, '域名 (domainName) 不能为空'],
    unique: true, // 域名应唯一
    trim: true,
    lowercase: true, // 存储为小写以确保唯一性
    match: [/^([a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/, '请输入有效的域名格式']
  },
  domainType: { // 域名类型
    type: String,
    enum: ['gTLD', 'ccTLD', 'New gTLD', '其他'], // 增加"其他"类型
    default: 'gTLD'
  },
  expiryDate: { // 到期日期
    type: Date,
    required: [true, '到期日期 (expiryDate) 不能为空']
  },
  holder: { type: String, trim: true }, // 持有者 (中文)
  resolverAccount: { type: String, trim: true }, // 解析管理账号
  resolverProvider: { type: String, trim: true }, // 解析管理方
  businessUsage: { type: String, trim: true }, // 业务使用情况
  icpStatus: { type: String, trim: true }, // ICP证状态
  renewalPriceRaw: { type: String, trim: true }, // 年续费价 (原始文本，如 "89元", "11 USD")
  // renewalPriceCurrency: { // (可选) 如果价格是数字，可以加货币单位
  //   type: String,
  //   enum: ['CNY', 'USD', ''], // 为空表示未知或混合
  //   default: ''
  // },
  renewalSuggestion: { // 续费建议
    type: String,
    enum: ['建议续费', '可不续费', '请示领导', '待评估', '不续费'],
    default: '待评估'
  },
  renewalSuggestionReason: { type: String, trim: true }, // 续费建议原因
  isMarkedForNoRenewal: { type: Boolean, default: false }, // 是否标记为不续费 (硬性指标)
  hasSpecialValue: { type: Boolean, default: false }, // 是否具有特殊价值 (硬性指标)
  notes: { type: String, trim: true }, // 备注信息
  lastEvaluatedAt: { type: Date, default: Date.now } // 上次评估续费建议的时间
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt 字段
});

// 添加 mongoose-paginate-v2 插件
domainSchema.plugin(mongoosePaginate);

// 创建索引以优化查询性能
domainSchema.index({ domainName: 1 }); // 域名唯一索引已在字段定义中通过 unique:true 实现
domainSchema.index({ expiryDate: 1 }); // 按到期日期索引
domainSchema.index({ domainType: 1 });
domainSchema.index({ holder: 'text', businessUsage: 'text', notes: 'text' }); // 文本索引，用于模糊搜索
domainSchema.index({ renewalSuggestion: 1 });
domainSchema.index({ createdAt: -1 }); // 按创建时间倒序

// Mongoose 中间件 (可选): 预处理保存操作
domainSchema.pre('save', function(next) {
  // 示例: 确保域名总是小写
  if (this.isModified('domainName') && this.domainName) {
    this.domainName = this.domainName.toLowerCase();
  }
  // 示例: 如果 renewalPriceRaw 包含数字和货币，可以尝试解析
  // (此逻辑较复杂，通常在服务层或控制器中处理)
  next();
});

module.exports = mongoose.model('Domain', domainSchema);
EOF


print_green "创建历史记录模型 (./backend/src/models/historyModel.js)..."
cat > "$PROJECT_DIR/backend/src/models/historyModel.js" << 'EOF'
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const historySchema = new mongoose.Schema({
  domainName: { // 相关域名 (可能为空，例如系统级操作)
    type: String,
    trim: true,
    lowercase: true
  },
  domainId: { // 关联的域名ID (如果适用)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain', // 引用Domain模型
    index: true // 为关联ID创建索引
  },
  actionType: { // 操作类型
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'IMPORT', 'RENEWAL_SUGGESTION_UPDATED', 'BACKUP', 'SYSTEM_TASK'], // 添加 SYSTEM_TASK
    required: [true, '操作类型 (actionType) 不能为空']
  },
  user: { // 操作用户 (可以是系统 'system' 或实际用户名)
    type: String,
    default: 'system', // 默认为系统操作
    trim: true
  },
  details: { // 操作详情 (混合类型，可以存储任意JSON结构)
    type: mongoose.Schema.Types.Mixed 
    // 示例: 对于UPDATE, 可以是 { changedFields: { field: { old: 'val1', new: 'val2' } } }
    // 示例: 对于IMPORT, 可以是 { filename: 'domains.csv', stats: { success: 10, failed: 2 } }
  },
  ipAddress: { type: String } // (可选) 记录操作者IP地址
}, {
  timestamps: true // 自动添加 createdAt (操作时间) 和 updatedAt 字段
});

// 添加 mongoose-paginate-v2 插件
historySchema.plugin(mongoosePaginate);

// 创建索引
historySchema.index({ actionType: 1 });
historySchema.index({ createdAt: -1 }); // 按创建时间倒序，常用查询模式

module.exports = mongoose.model('History', historySchema);
EOF


print_green "创建系统配置模型 (./backend/src/models/systemModel.js)..."
cat > "$PROJECT_DIR/backend/src/models/systemModel.js" << 'EOF'
const mongoose = require('mongoose');

// 用于存储续费标准文档
const renewalStandardsSchema = new mongoose.Schema({
  content: { // Markdown格式的续费标准内容
    type: String,
    required: [true, '续费标准内容 (content) 不能为空'],
    trim: true
  },
  version: { // (可选) 版本号，用于追踪变更
    type: Number,
    default: 1
  },
  updatedBy: { // 最后更新人
    type: String,
    default: 'system'
  }
}, {
  timestamps: true // 包含 createdAt 和 updatedAt
});

// 系统中只应该有一份续费标准，可以使用固定ID或确保只创建一个文档
// 例如，在服务层获取时，如果找不到则创建默认的。

module.exports = mongoose.model('RenewalStandard', renewalStandardsSchema); // 模型名改为单数
EOF

print_green "创建域名控制器 (./backend/src/controllers/domainController.js)..."
cat > "$PROJECT_DIR/backend/src/controllers/domainController.js" << 'EOF'
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
EOF

print_green "创建历史记录控制器 (./backend/src/controllers/historyController.js)..."
cat > "$PROJECT_DIR/backend/src/controllers/historyController.js" << 'EOF'
const asyncHandler = require('express-async-handler');
const History = require('../models/historyModel');

// @描述    获取历史记录列表 (支持分页和筛选)
// @路由    GET /api/history
// @访问    私有 (未来应添加认证)
const getHistories = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    domainName,
    actionType
  } = req.query;

  // 构建查询条件
  const filter = {};

  if (domainName) {
    filter.domainName = { $regex: domainName, $options: 'i' };
  }

  if (actionType) {
    filter.actionType = actionType;
  }

  // 分页选项
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 }, // 按创建时间倒序
    lean: true
  };

  const result = await History.paginate(filter, options);

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

module.exports = {
  getHistories
};
EOF

print_green "创建系统控制器 (./backend/src/controllers/systemController.js)..."
cat > "$PROJECT_DIR/backend/src/controllers/systemController.js" << 'EOF'
const asyncHandler = require('express-async-handler');
const fs = require('fs').promises; // 使用 Promise 版本的 fs
const path = require('path');
const mongoose = require('mongoose'); // 需要 mongoose 来判断模型是否已注册

const Domain = require('../models/domainModel'); // 确保模型已加载
const History = require('../models/historyModel');
const RenewalStandard = require('../models/systemModel'); // 注意模型名称改为单数
const { checkDBConnection, getDBStats } = require('../config/db');
const { evaluateRenewal } = require('../utils/renewalEvaluator');
const logger = require('../utils/logger');

// 辅助函数 - 记录历史
const logSystemHistory = async (actionType, details = {}, user = 'system', req = null) => {
  try {
    await History.create({ 
      actionType, 
      user: req?.user?.username || user, 
      details,
      ipAddress: req?.ip 
    });
  } catch (error) {
    logger.error(`记录系统历史失败 (${actionType}): ${error.message}`);
  }
};

// @描述    获取系统健康状态
// @路由    GET /api/system/health
const getHealthStatus = asyncHandler(async (req, res) => {
  const dbConnection = checkDBConnection();
  const dbStats = await getDBStats(); // 此函数已在 db.js 中处理数据库未连接的情况
  
  const uptimeInSeconds = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    server: {
      uptime: uptimeInSeconds,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      },
      node: process.version,
      platform: process.platform,
      architecture: process.arch
    },
    database: {
      connected: dbConnection.connected,
      stateString: dbConnection.stateString,
      stats: dbStats
    }
  };
  
  res.json({ status: 'success', data: healthStatus });
});

// @描述    检查所有域名到期情况并更新续费建议
// @路由    POST /api/system/check-expiries
const checkExpiries = asyncHandler(async (req, res) => {
  const domains = await Domain.find({});
  const results = { total: domains.length, updated: 0, unchanged: 0, errors: [] };

  for (const domain of domains) {
    try {
      const oldSuggestion = domain.renewalSuggestion;
      const oldReason = domain.renewalSuggestionReason;
      const { suggestion, reason } = evaluateRenewal(domain.toObject());

      if (domain.renewalSuggestion !== suggestion || domain.renewalSuggestionReason !== reason) {
        domain.renewalSuggestion = suggestion;
        domain.renewalSuggestionReason = reason;
        domain.lastEvaluatedAt = new Date();
        await domain.save();
        results.updated++;
        // 为每个更新的域名记录历史
        await History.create({
          domainName: domain.domainName,
          domainId: domain._id,
          actionType: 'RENEWAL_SUGGESTION_UPDATED',
          user: req.user?.username || 'system',
          details: { 
            oldSuggestion, oldReason, 
            newSuggestion: suggestion, newReason: reason,
            isSystemTask: true
          },
          ipAddress: req.ip
        });
      } else {
        results.unchanged++;
      }
    } catch (error) {
      results.errors.push({ domainName: domain.domainName, error: error.message });
      logger.error(`检查域名 ${domain.domainName} 到期时出错: ${error.message}`);
    }
  }
  
  // 记录总体操作
  await logSystemHistory('SYSTEM_TASK', { task: 'checkExpiries', summary: results }, 'system', req);
  logger.info(`检查域名到期完成: 总计 ${results.total}, 更新 ${results.updated}, 未变 ${results.unchanged}, 错误 ${results.errors.length}`);
  
  res.json({ status: 'success', data: results });
});

// @描述    获取续费标准内容
// @路由    GET /api/system/renewal-standards
const getRenewalStandards = asyncHandler(async (req, res) => {
  let standards = await RenewalStandard.findOne().sort({ updatedAt: -1 }); // 获取最新的
  
  if (!standards) {
    const defaultContent = `# 域名续费标准 (默认)

## 续费原则
1.  **业务使用**: 正在使用的域名应优先续费。
2.  **ICP证**: 已办理ICP证的域名一般应续费以维持备案。
3.  **特殊价值**: 具有特殊商业或品牌价值的域名应续费。
4.  **不再使用**: 明确不再使用且无特殊价值的域名可考虑不续费。

## 续费建议分类
-   **建议续费**: 符合上述原则1、2或3。
-   **可不续费**: 域名未使用且无特殊价值。
-   **请示领导**: 域名情况较特殊（如未使用的.cn域名），需人工决策。
-   **待评估**: 域名信息不完整或不符合明确规则，需人工评估。
-   **不续费**: 域名已被明确标记为"不续费"。

## 自动评估规则 (大致顺序)
1.  若域名标记为"不续费"，则建议为"不续费"。
2.  若域名标记为"具有特殊价值"，则建议为"建议续费"。
3.  若域名有实际业务使用 (非"未使用"、"闲置"、"无")，则建议为"建议续费"。
4.  若域名有ICP证 (非"无")，则建议为"建议续费"。
5.  若为gTLD/New gTLD，且未使用，则建议为"可不续费"。
6.  若为中国ccTLD (.cn, .中国)，且未使用，则建议为"请示领导"。
7.  若为其他国家ccTLD，且未使用，则建议为"可不续费"。
8.  其他情况，建议为"待评估"。

## CSV导入导出格式说明

### 支持的字段
系统支持以下CSV字段的导入导出（标题行必须精确匹配）：

- **域名** (必填): 域名地址，如 example.com
- **域名类型** (可选): gTLD、ccTLD、New gTLD、其他，默认为 gTLD
- **到期日期** (必填): 格式为 YYYY-MM-DD 或其他可被解析的日期格式
- **持有者** (可选): 域名持有主体的中文名称
- **解析管理账号** (可选): 用于管理域名解析的账号
- **解析管理方** (可选): 提供域名解析服务的机构，如 Cloudflare、DNSPod
- **业务使用情况** (可选): 域名的具体使用场景，如"公司官网"、"未使用"
- **ICP证** (可选): ICP备案状态，如"无"、"京ICP备XXXXXXXX号"
- **年续费价** (可选): 域名年续费价格，如"39元"、"11 USD"
- **标记为不续费** (可选): 布尔值，可填入"是/否"、"true/false"或"1/0"
- **具有特殊价值** (可选): 布尔值，可填入"是/否"、"true/false"或"1/0"  
- **备注信息** (可选): 其他相关备注

### 导入注意事项
- 文件必须为标准CSV格式，推荐UTF-8编码
- 标题行字段名称必须精确匹配（区分大小写）
- 重复域名将被更新而非重复创建
- 系统会自动为每个域名评估续费建议
- 导入完成后会显示成功、更新和失败的详细统计

### 导出说明
- 导出文件包含所有域名的完整信息
- 布尔值将转换为"是/否"格式
- 日期将格式化为YYYY-MM-DD格式
- 文件名自动包含导出时间戳
`;
    standards = await RenewalStandard.create({ content: defaultContent });
    logger.info('创建了默认的续费标准文档。');
    await logSystemHistory('SYSTEM_TASK', { task: 'createDefaultRenewalStandards' }, 'system', req);
  }
  
  res.json({ status: 'success', data: standards });
});

// @描述    备份数据库 (当前实现为导出JSON)
// @路由    GET /api/system/backup
const backupDatabase = asyncHandler(async (req, res) => {
  const backupDir = path.join(__dirname, '../../backups'); // 存储在项目 backend/backups
  await fs.mkdir(backupDir, { recursive: true }); // 确保目录存在

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFiles = [];
  const backupStats = { domains: 0, histories: 0, renewalStandards: 0 };

  try {
    // 备份 Domains 集合
    if (mongoose.models.Domain) {
        const domains = await Domain.find({}).lean();
        const domainsFile = `domains_backup_${timestamp}.json`;
        await fs.writeFile(path.join(backupDir, domainsFile), JSON.stringify(domains, null, 2));
        backupFiles.push(domainsFile);
        backupStats.domains = domains.length;
    }

    // 备份 Histories 集合
    if (mongoose.models.History) {
        const histories = await History.find({}).lean();
        const historiesFile = `histories_backup_${timestamp}.json`;
        await fs.writeFile(path.join(backupDir, historiesFile), JSON.stringify(histories, null, 2));
        backupFiles.push(historiesFile);
        backupStats.histories = histories.length;
    }

    // 备份 RenewalStandards 集合
    if (mongoose.models.RenewalStandard) {
        const standards = await RenewalStandard.find({}).lean();
        const standardsFile = `renewalstandards_backup_${timestamp}.json`;
        await fs.writeFile(path.join(backupDir, standardsFile), JSON.stringify(standards, null, 2));
        backupFiles.push(standardsFile);
        backupStats.renewalStandards = standards.length;
    }

    await logSystemHistory('BACKUP', { timestamp, files: backupFiles, stats: backupStats }, 'system', req);
    logger.info(`数据库备份完成: ${JSON.stringify(backupStats)}. 文件位于: ${backupDir}`);
    
    res.json({
      status: 'success',
      data: { timestamp, files: backupFiles, stats: backupStats, locationMessage: `备份文件已保存至服务器 ${backupDir} 目录内。` }
    });

  } catch (error) {
    logger.error(`数据库备份失败: ${error.message}`, { stack: error.stack });
    throw new Error(`数据库备份过程中发生错误: ${error.message}`); // 抛出错误给errorHandler
  }
});

module.exports = {
  getHealthStatus,
  checkExpiries,
  getRenewalStandards,
  backupDatabase
};
EOF

print_green "创建仪表盘控制器 (./backend/src/controllers/dashboardController.js)..."
cat > "$PROJECT_DIR/backend/src/controllers/dashboardController.js" << 'EOF'
const asyncHandler = require('express-async-handler');
const dayjs = require('dayjs'); // 用于日期计算
const Domain = require('../models/domainModel'); // 确保模型已加载

// @描述    获取仪表盘统计数据
// @路由    GET /api/dashboard/stats
// @访问    私有 (未来应添加认证)
const getDashboardStats = asyncHandler(async (req, res) => {
  const totalDomains = await Domain.countDocuments();

  // 域名类型分布
  const domainTypeDistribution = await Domain.aggregate([
    { $group: { _id: '$domainType', count: { $sum: 1 } } },
    { $project: { _id: 0, type: '$_id', count: 1 } },
    { $sort: { count: -1 } } // 按数量降序
  ]);

  // 续费建议分布
  const renewalSuggestionDistribution = await Domain.aggregate([
    { $group: { _id: '$renewalSuggestion', count: { $sum: 1 } } },
    { $project: { _id: 0, suggestion: '$_id', count: 1 } },
    { $sort: { count: -1 } }
  ]);

  // 到期趋势计算
  const now = dayjs();
  const expiryRanges = {
    '30天内': { $gte: now.toDate(), $lte: now.add(30, 'day').toDate() },
    '60天内': { $gt: now.add(30, 'day').toDate(), $lte: now.add(60, 'day').toDate() },
    '90天内': { $gt: now.add(60, 'day').toDate(), $lte: now.add(90, 'day').toDate() },
    '180天内': { $gt: now.add(90, 'day').toDate(), $lte: now.add(180, 'day').toDate() },
    '一年内': { $gt: now.add(180, 'day').toDate(), $lte: now.add(365, 'day').toDate() },
    '一年以上': { $gt: now.add(365, 'day').toDate() }
    // (可选) '已过期': { $lt: now.toDate() }
  };

  const expiryTrend = {};
  for (const [label, dateFilter] of Object.entries(expiryRanges)) {
    expiryTrend[label] = await Domain.countDocuments({ expiryDate: dateFilter });
  }

  // 需要紧急关注的域名 (30天内到期且建议续费的，按到期日升序，最多10条)
  const urgentDomains = await Domain.find({
    expiryDate: expiryRanges['30天内'], // 复用上面的日期范围
    renewalSuggestion: '建议续费'
  })
  .sort({ expiryDate: 1 })
  .limit(10)
  .select('domainName holder expiryDate businessUsage') // 只选择必要字段
  .lean();

  res.json({
    status: 'success',
    data: {
      totalDomains,
      domainTypeDistribution,
      renewalSuggestionDistribution,
      expiryTrend,
      urgentDomains
    }
  });
});

module.exports = {
  getDashboardStats
};
EOF

print_green "创建域名路由 (./backend/src/routes/domainRoutes.js)..."
cat > "$PROJECT_DIR/backend/src/routes/domainRoutes.js" << 'EOF'
const express = require('express');
const router = express.Router();
const multer = require('multer'); // 用于处理文件上传

const {
  getDomains, getDomain, createDomain, updateDomain, deleteDomain,
  evaluateDomainRenewal, batchOperateDomains,
  importDomainsFromCSV, exportDomainsToCSV
} = require('../controllers/domainController'); // 引入控制器方法

// Multer 配置：用于处理CSV文件上传，存储在内存中
const storage = multer.memoryStorage(); // 将文件存储在内存中作为Buffer
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 限制文件大小为10MB
  fileFilter: (req, file, cb) => { // 文件类型过滤器
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true); // 接受文件
    } else {
      cb(new Error('文件格式无效，仅支持CSV文件。'), false); // 拒绝文件
    }
  }
});

// --- 域名资源路由 ---
router.route('/')
  .get(getDomains)    // 获取所有域名
  .post(createDomain); // 创建新域名

router.route('/:id')
  .get(getDomain)     // 获取单个域名详情
  .put(updateDomain)  // 更新指定ID的域名
  .delete(deleteDomain); // 删除指定ID的域名

// 特定操作路由
router.post('/:id/evaluate-renewal', evaluateDomainRenewal); // 评估指定域名的续费建议
router.post('/batch', batchOperateDomains); // 批量操作域名

// CSV导入导出路由
router.post('/import', upload.single('csvFile'), importDomainsFromCSV); // 'csvFile'是前端上传文件时字段名
router.get('/export', exportDomainsToCSV); // 导出所有域名为CSV

module.exports = router;
EOF

print_green "创建历史记录路由 (./backend/src/routes/historyRoutes.js)..."
cat > "$PROJECT_DIR/backend/src/routes/historyRoutes.js" << 'EOF'
const express = require('express');
const router = express.Router();
const { getHistories } = require('../controllers/historyController');

// --- 历史记录路由 ---
router.get('/', getHistories); // 获取历史记录列表 (支持分页和筛选)

module.exports = router;
EOF

print_green "创建系统管理路由 (./backend/src/routes/systemRoutes.js)..."
cat > "$PROJECT_DIR/backend/src/routes/systemRoutes.js" << 'EOF'
const express = require('express');
const router = express.Router();
const {
  getHealthStatus,
  checkExpiries,
  getRenewalStandards,
  backupDatabase
} = require('../controllers/systemController');

// --- 系统管理路由 ---
router.get('/health', getHealthStatus);               // 获取系统健康状态
router.post('/check-expiries', checkExpiries);        // 触发检查域名到期任务
router.get('/renewal-standards', getRenewalStandards); // 获取续费标准内容
router.get('/backup', backupDatabase);                // 触发数据库备份

module.exports = router;
EOF

print_green "创建仪表盘路由 (./backend/src/routes/dashboardRoutes.js)..."
cat > "$PROJECT_DIR/backend/src/routes/dashboardRoutes.js" << 'EOF'
const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');

// --- 仪表盘路由 ---
router.get('/stats', getDashboardStats); // 获取仪表盘统计数据

module.exports = router;
EOF

print_green "后端数据模型、控制器及路由创建完成！"
print_blue "========================================"
print_blue "         后端模型与业务逻辑摘要"
print_blue "========================================"
echo "已创建模型: domainModel.js (添加了mongoose-paginate-v2), historyModel.js (添加了mongoose-paginate-v2), systemModel.js"
echo "已创建控制器: domainController.js (完整的CRUD、CSV导入导出、批量操作), historyController.js, systemController.js (增强), dashboardController.js"
echo "已创建路由: domainRoutes.js, historyRoutes.js, systemRoutes.js, dashboardRoutes.js"
print_yellow "继续执行管理与启动脚本生成器..."

exit 0
