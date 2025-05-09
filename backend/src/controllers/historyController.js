const asyncHandler = require('express-async-handler');
const History = require('../models/History');

// @desc    获取所有历史记录
// @route   GET /api/history
// @access  Private
const getAllHistory = asyncHandler(async (req, res) => {
  const history = await History.find({}).sort({ operatedAt: -1 });
  res.json(history);
});

// @desc    根据域名ID获取历史记录
// @route   GET /api/history/domain/:domainId
// @access  Private
const getHistoryByDomainId = asyncHandler(async (req, res) => {
  const history = await History.find({ domainId: req.params.domainId }).sort({ operatedAt: -1 });
  res.json(history);
});

// @desc    根据操作类型获取历史记录
// @route   GET /api/history/action/:action
// @access  Private
const getHistoryByAction = asyncHandler(async (req, res) => {
  const history = await History.find({ action: req.params.action }).sort({ operatedAt: -1 });
  res.json(history);
});

// @desc    获取最近的历史记录
// @route   GET /api/history/recent/:count
// @access  Private
const getRecentHistory = asyncHandler(async (req, res) => {
  const count = parseInt(req.params.count) || 10;
  const history = await History.find({}).sort({ operatedAt: -1 }).limit(count);
  res.json(history);
});

module.exports = {
  getAllHistory,
  getHistoryByDomainId,
  getHistoryByAction,
  getRecentHistory
};
