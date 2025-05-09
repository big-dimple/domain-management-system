const express = require('express');
const router = express.Router();
const {
  getAllDomains,
  getDomainById,
  createDomain,
  updateDomain,
  deleteDomain,
  importDomains,
  markNoRenewal,
  runDomainCheck
} = require('../controllers/domainController');

// 获取所有域名
router.get('/', getAllDomains);

// 获取单个域名
router.get('/:id', getDomainById);

// 创建域名
router.post('/', createDomain);

// 更新域名
router.put('/:id', updateDomain);

// 删除域名
router.delete('/:id', deleteDomain);

// 批量导入域名
router.post('/import', importDomains);

// 标记域名不续费
router.put('/:id/no-renewal', markNoRenewal);

// 运行域名检查任务
router.post('/check', runDomainCheck);

module.exports = router;
