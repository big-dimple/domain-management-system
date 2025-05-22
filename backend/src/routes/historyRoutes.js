const express = require('express');
const router = express.Router();
const { getHistories } = require('../controllers/historyController');

// --- 历史记录路由 ---
router.get('/', getHistories); // 获取历史记录列表 (支持分页和筛选)

module.exports = router;
