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
