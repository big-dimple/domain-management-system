const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const domainSchema = new mongoose.Schema({
  domainName: { // 域名
    type: String,
    required: [true, '域名 (domainName) 不能为空'],
    unique: true, // 域名应唯一
    trim: true,
    lowercase: true, // 存储为小写以确保唯一性
    match: [/^([a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/, '请输入有效的域名格式']
  },
  domainType: { // 域名类型
    type: String,
    enum: ['gTLD', 'ccTLD', 'New gTLD', '其他'], // 增加"其他"类型
    default: 'gTLD'
  },
  expiryDate: { // 到期日期
    type: Date,
    required: [true, '到期日期 (expiryDate) 不能为空']
  },
  holder: { type: String, trim: true }, // 持有者 (中文)
  resolverAccount: { type: String, trim: true }, // 解析管理账号
  resolverProvider: { type: String, trim: true }, // 解析管理方
  businessUsage: { type: String, trim: true }, // 业务使用情况
  icpStatus: { type: String, trim: true }, // ICP证状态
  renewalPriceRaw: { type: String, trim: true }, // 年续费价 (原始文本，如 "89元", "11 USD")
  // renewalPriceCurrency: { // (可选) 如果价格是数字，可以加货币单位
  //   type: String,
  //   enum: ['CNY', 'USD', ''], // 为空表示未知或混合
  //   default: ''
  // },
  renewalSuggestion: { // 续费建议
    type: String,
    enum: ['建议续费', '可不续费', '请示领导', '待评估', '不续费'],
    default: '待评估'
  },
  renewalSuggestionReason: { type: String, trim: true }, // 续费建议原因
  isMarkedForNoRenewal: { type: Boolean, default: false }, // 是否标记为不续费 (硬性指标)
  hasSpecialValue: { type: Boolean, default: false }, // 是否具有特殊价值 (硬性指标)
  notes: { type: String, trim: true }, // 备注信息
  lastEvaluatedAt: { type: Date, default: Date.now } // 上次评估续费建议的时间
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt 字段
});

// 添加 mongoose-paginate-v2 插件
domainSchema.plugin(mongoosePaginate);

// 创建索引以优化查询性能
domainSchema.index({ domainName: 1 }); // 域名唯一索引已在字段定义中通过 unique:true 实现
domainSchema.index({ expiryDate: 1 }); // 按到期日期索引
domainSchema.index({ domainType: 1 });
domainSchema.index({ holder: 'text', businessUsage: 'text', notes: 'text' }); // 文本索引，用于模糊搜索
domainSchema.index({ renewalSuggestion: 1 });
domainSchema.index({ createdAt: -1 }); // 按创建时间倒序

// Mongoose 中间件 (可选): 预处理保存操作
domainSchema.pre('save', function(next) {
  // 示例: 确保域名总是小写
  if (this.isModified('domainName') && this.domainName) {
    this.domainName = this.domainName.toLowerCase();
  }
  // 示例: 如果 renewalPriceRaw 包含数字和货币，可以尝试解析
  // (此逻辑较复杂，通常在服务层或控制器中处理)
  next();
});

module.exports = mongoose.model('Domain', domainSchema);
