const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  domainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: true
  },
  domainName: {
    type: String,
    required: true,
    trim: true
  },
  action: {
    type: String,
    required: true,
    enum: ['新增', '更新', '删除', '不续费'],
    trim: true
  },
  field: {
    type: String,
    trim: true
  },
  oldValue: {
    type: String,
    trim: true
  },
  newValue: {
    type: String,
    trim: true
  },
  reason: {
    type: String,
    trim: true,
    default: ''
  },
  operatedBy: {
    type: String,
    default: 'admin',
    trim: true
  },
  operatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // 自动添加createdAt
});

// 添加索引
historySchema.index({ domainId: 1 });
historySchema.index({ action: 1 });
historySchema.index({ operatedAt: -1 });

module.exports = mongoose.model('History', historySchema);
