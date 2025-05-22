const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const historySchema = new mongoose.Schema({
  domainName: { // 相关域名 (可能为空，例如系统级操作)
    type: String,
    trim: true,
    lowercase: true
  },
  domainId: { // 关联的域名ID (如果适用)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain', // 引用Domain模型
    index: true // 为关联ID创建索引
  },
  actionType: { // 操作类型
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'IMPORT', 'RENEWAL_SUGGESTION_UPDATED', 'BACKUP', 'SYSTEM_TASK'], // 添加 SYSTEM_TASK
    required: [true, '操作类型 (actionType) 不能为空']
  },
  user: { // 操作用户 (可以是系统 'system' 或实际用户名)
    type: String,
    default: 'system', // 默认为系统操作
    trim: true
  },
  details: { // 操作详情 (混合类型，可以存储任意JSON结构)
    type: mongoose.Schema.Types.Mixed 
    // 示例: 对于UPDATE, 可以是 { changedFields: { field: { old: 'val1', new: 'val2' } } }
    // 示例: 对于IMPORT, 可以是 { filename: 'domains.csv', stats: { success: 10, failed: 2 } }
  },
  ipAddress: { type: String } // (可选) 记录操作者IP地址
}, {
  timestamps: true // 自动添加 createdAt (操作时间) 和 updatedAt 字段
});

// 添加 mongoose-paginate-v2 插件
historySchema.plugin(mongoosePaginate);

// 创建索引
historySchema.index({ actionType: 1 });
historySchema.index({ createdAt: -1 }); // 按创建时间倒序，常用查询模式

module.exports = mongoose.model('History', historySchema);
