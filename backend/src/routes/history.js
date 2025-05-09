const express = require('express');
const router = express.Router();
const {
  getAllHistory,
  getHistoryByDomainId,
  getHistoryByAction,
  getRecentHistory
} = require('../controllers/historyController');

// 获取所有历史记录
router.get('/', getAllHistory);

// 获取指定域名的历史记录
router.get('/domain/:domainId', getHistoryByDomainId);

// 获取指定操作类型的历史记录
router.get('/action/:action', getHistoryByAction);

// 获取最近的历史记录
router.get('/recent/:count', getRecentHistory);

module.exports = router;
