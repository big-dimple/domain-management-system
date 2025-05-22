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
