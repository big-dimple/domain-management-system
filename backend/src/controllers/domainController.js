const asyncHandler = require('express-async-handler');
const Domain = require('../models/Domain');
const History = require('../models/History');
const domainChecker = require('../cron/domainChecker');

// @desc    获取所有域名
// @route   GET /api/domains
// @access  Private
const getAllDomains = asyncHandler(async (req, res) => {
  const domains = await Domain.find({}).sort({ expiryDate: 1 });
  res.json(domains);
});

// @desc    根据ID获取域名
// @route   GET /api/domains/:id
// @access  Private
const getDomainById = asyncHandler(async (req, res) => {
  const domain = await Domain.findById(req.params.id);
  
  if (!domain) {
    res.status(404);
    throw new Error('域名未找到');
  }
  
  res.json(domain);
});

// @desc    创建新域名
// @route   POST /api/domains
// @access  Private
const createDomain = asyncHandler(async (req, res) => {
  const {
    name,
    type,
    renewalFee,
    expiryDate,
    holder,
    dnsAccount,
    dnsManager,
    usage,
    icpRegistration,
    icpLicense,
    notes
  } = req.body;

  // 检查域名是否已存在
  const domainExists = await Domain.findOne({ name });
  if (domainExists) {
    res.status(400);
    throw new Error('域名已存在');
  }

  // 创建域名
  const domain = await Domain.create({
    name,
    type,
    renewalFee,
    expiryDate,
    holder,
    dnsAccount,
    dnsManager,
    usage,
    icpRegistration,
    icpLicense,
    notes,
    lastChecked: new Date()
  });

  // 记录历史
  await History.create({
    domainId: domain._id,
    domainName: domain.name,
    action: '新增',
    field: '全部',
    newValue: `新域名: ${domain.name}`,
    operatedBy: 'admin', // 实际应用中应该获取当前用户信息
    operatedAt: new Date()
  });

  res.status(201).json(domain);
});

// @desc    更新域名
// @route   PUT /api/domains/:id
// @access  Private
const updateDomain = asyncHandler(async (req, res) => {
  const domain = await Domain.findById(req.params.id);
  
  if (!domain) {
    res.status(404);
    throw new Error('域名未找到');
  }

  // 保存修改前的值，用于历史记录
  const oldValues = {...domain.toObject()};

  // 更新域名
  const updatedDomain = await Domain.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  // 记录修改历史
  for (const [key, newValue] of Object.entries(req.body)) {
    // 如果值发生了变化且不是_id字段
    if (key !== '_id' && JSON.stringify(oldValues[key]) !== JSON.stringify(newValue)) {
      await History.create({
        domainId: domain._id,
        domainName: domain.name,
        action: '更新',
        field: key,
        oldValue: String(oldValues[key]),
        newValue: String(newValue),
        operatedBy: 'admin', // 实际应用中应该获取当前用户信息
        operatedAt: new Date()
      });
    }
  }

  res.json(updatedDomain);
});

// @desc    删除域名
// @route   DELETE /api/domains/:id
// @access  Private
const deleteDomain = asyncHandler(async (req, res) => {
  const domain = await Domain.findById(req.params.id);
  
  if (!domain) {
    res.status(404);
    throw new Error('域名未找到');
  }

  await domain.deleteOne();

  // 记录删除历史
  await History.create({
    domainId: domain._id,
    domainName: domain.name,
    action: '删除',
    field: '全部',
    oldValue: `域名: ${domain.name}`,
    operatedBy: 'admin', // 实际应用中应该获取当前用户信息
    operatedAt: new Date()
  });

  res.json({ message: '域名已删除' });
});

// @desc    批量导入域名
// @route   POST /api/domains/import
// @access  Private
const importDomains = asyncHandler(async (req, res) => {
  const { domains } = req.body;
  
  if (!domains || !Array.isArray(domains) || domains.length === 0) {
    res.status(400);
    throw new Error('无效的域名数据');
  }

  const results = {
    success: 0,
    failed: 0,
    duplicates: 0
  };

  // 批量处理域名
  for (const domainData of domains) {
    try {
      // 检查域名是否已存在
      const domainExists = await Domain.findOne({ name: domainData.name });
      
      if (domainExists) {
        results.duplicates += 1;
        continue;
      }

      // 创建新域名
      const domain = await Domain.create({
        ...domainData,
        lastChecked: new Date()
      });

      // 记录历史
      await History.create({
        domainId: domain._id,
        domainName: domain.name,
        action: '新增',
        field: '全部',
        newValue: `导入域名: ${domain.name}`,
        operatedBy: 'admin', // 实际应用中应该获取当前用户信息
        operatedAt: new Date()
      });

      results.success += 1;
    } catch (error) {
      console.error(`导入域名失败: ${domainData.name}`, error);
      results.failed += 1;
    }
  }

  res.status(201).json({
    message: '域名导入完成',
    results
  });
});

// @desc    标记域名不续费
// @route   PUT /api/domains/:id/no-renewal
// @access  Private
const markNoRenewal = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  
  const domain = await Domain.findById(req.params.id);
  
  if (!domain) {
    res.status(404);
    throw new Error('域名未找到');
  }

  domain.willRenew = false;
  await domain.save();

  // 记录不续费决策历史
  await History.create({
    domainId: domain._id,
    domainName: domain.name,
    action: '不续费',
    field: 'willRenew',
    oldValue: 'true',
    newValue: 'false',
    reason: reason || '',
    operatedBy: 'admin', // 实际应用中应该获取当前用户信息
    operatedAt: new Date()
  });

  res.json({ message: '域名已标记为不续费' });
});

// @desc    运行域名检查任务
// @route   POST /api/domains/check
// @access  Private
const runDomainCheck = asyncHandler(async (req, res) => {
  // 异步执行检查任务
  domainChecker.checkAllDomains().catch(err => {
    console.error('域名检查任务失败:', err);
  });
  
  res.json({ message: '域名检查任务已启动' });
});

module.exports = {
  getAllDomains,
  getDomainById,
  createDomain,
  updateDomain,
  deleteDomain,
  importDomains,
  markNoRenewal,
  runDomainCheck
};
