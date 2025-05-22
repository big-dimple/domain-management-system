const mongoose = require('mongoose');

// 用于存储续费标准文档
const renewalStandardsSchema = new mongoose.Schema({
  content: { // Markdown格式的续费标准内容
    type: String,
    required: [true, '续费标准内容 (content) 不能为空'],
    trim: true
  },
  version: { // (可选) 版本号，用于追踪变更
    type: Number,
    default: 1
  },
  updatedBy: { // 最后更新人
    type: String,
    default: 'system'
  }
}, {
  timestamps: true // 包含 createdAt 和 updatedAt
});

// 系统中只应该有一份续费标准，可以使用固定ID或确保只创建一个文档
// 例如，在服务层获取时，如果找不到则创建默认的。

module.exports = mongoose.model('RenewalStandard', renewalStandardsSchema); // 模型名改为单数
