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
