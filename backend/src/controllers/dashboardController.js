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
