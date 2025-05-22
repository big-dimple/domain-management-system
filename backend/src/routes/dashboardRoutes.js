const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');

// --- 仪表盘路由 ---
router.get('/stats', getDashboardStats); // 获取仪表盘统计数据

module.exports = router;
