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
