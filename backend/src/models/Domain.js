const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  renewalFee: {
    type: String,
    required: true,
    trim: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  holder: {
    type: String,
    required: true,
    trim: true
  },
  dnsAccount: {
    type: String,
    trim: true,
    default: ''
  },
  dnsManager: {
    type: String,
    trim: true,
    default: ''
  },
  usage: {
    type: String,
    trim: true,
    default: '未使用'
  },
  icpRegistration: {
    type: Boolean,
    default: false
  },
  icpLicense: {
    type: String,
    trim: true,
    default: '无'
  },
  importance: {
    type: Number,
    default: 0 // 0-低, 1-中, 2-高
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  lastChecked: {
    type: Date,
    default: Date.now
  },
  registrationDate: {
    type: Date,
    default: null
  },
  willRenew: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // 自动添加createdAt和updatedAt字段
});

// 添加索引
domainSchema.index({ name: 1 });
domainSchema.index({ expiryDate: 1 });
domainSchema.index({ holder: 1 });

module.exports = mongoose.model('Domain', domainSchema);
