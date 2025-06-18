const mongoose = require('mongoose');

// 域名模型
const domainSchema = new mongoose.Schema({
  domainName: { type: String, required: true, unique: true, lowercase: true },
  domainType: { type: String, default: 'gTLD' },
  expiryDate: { type: Date, required: true },
  holder: String,
  businessUsage: String,
  hasICP: { type: Boolean, default: false },
  renewalPrice: String,
  renewalSuggestion: { 
    type: String, 
    enum: ['保持续费', '建议续费', '紧急续费', '请示领导', '待评估', '不续费'],
    default: '待评估'
  },
  notes: String,
  isMarkedForNoRenewal: { type: Boolean, default: false },
  hasSpecialValue: { type: Boolean, default: false },
  lastScanned: Date,
  scanStatus: { 
    type: String, 
    enum: ['pending', 'scanning', 'success', 'failed', 'error'],
    default: 'pending'
  },
  scanError: String,
  registrar: String,
  nameServers: [String],
  dnssec: Boolean,
  autoScanned: { type: Boolean, default: false }
}, { timestamps: true });

// SSL证书模型
const sslCertificateSchema = new mongoose.Schema({
  domain: { type: String, required: true, unique: true, lowercase: true },
  issuer: String,
  subject: String,
  validFrom: Date,
  validTo: Date,
  daysRemaining: Number,
  serialNumber: String,
  fingerprint: String,
  status: {
    type: String,
    enum: ['active', 'warning', 'critical', 'expired', 'error'],
    default: 'active'
  },
  lastChecked: Date,
  checkError: String,
  autoRenew: { type: Boolean, default: false },
  provider: String,
  cost: String,
  notes: String,
  isWildcard: { type: Boolean, default: false },
  alternativeNames: [String],
  accessible: { type: Boolean, default: true }  // 新增字段：标记证书是否可访问
}, { timestamps: true });

// 扫描任务模型
const scanTaskSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true },
  taskType: { type: String, enum: ['domain', 'ssl', 'both'], default: 'domain' },
  status: { 
    type: String, 
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  totalItems: Number,
  scannedItems: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  startTime: Date,
  endTime: Date,
  errors: [{ item: String, error: String }],
  triggeredBy: { type: String, enum: ['manual', 'scheduled'], default: 'manual' }
}, { timestamps: true });

// 告警配置模型
const alertConfigSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['dingtalk', 'wechat', 'feishu', 'email'],
    required: true
  },
  name: { type: String, required: true },
  webhook: String,
  emailConfig: {
    host: String,
    port: Number,
    secure: Boolean,
    auth: {
      user: String,
      pass: String
    },
    recipients: [String]
  },
  enabled: { type: Boolean, default: true },
  alertTypes: [{
    type: String,
    enum: ['domain', 'ssl', 'both'],
    default: 'both'
  }],
  domainDaysBeforeExpiry: { type: Number, default: 30 },
  sslDaysBeforeExpiry: { type: Number, default: 14 },
  lastAlertTime: Date,
  alertHistory: [{
    sentAt: Date,
    itemCount: Number,
    alertType: String,
    success: Boolean,
    error: String
  }]
}, { timestamps: true });

// 评估配置模型
const evaluationConfigSchema = new mongoose.Schema({
  // 域名评估配置
  domainConfig: {
    urgentDays: { type: Number, default: 7 },
    suggestDays: { type: Number, default: 30 },
    attentionDays: { type: Number, default: 90 }
  },
  // SSL证书评估配置
  sslConfig: {
    criticalDays: { type: Number, default: 7 },
    warningDays: { type: Number, default: 30 },
    attentionDays: { type: Number, default: 60 }
  },
  customRules: [{
    name: String,
    type: { type: String, enum: ['domain', 'ssl'] },
    condition: String,
    suggestion: String,
    priority: Number
  }],
  updatedBy: String
}, { timestamps: true });

module.exports = {
  Domain: mongoose.model('Domain', domainSchema),
  SSLCertificate: mongoose.model('SSLCertificate', sslCertificateSchema),
  ScanTask: mongoose.model('ScanTask', scanTaskSchema),
  AlertConfig: mongoose.model('AlertConfig', alertConfigSchema),
  EvaluationConfig: mongoose.model('EvaluationConfig', evaluationConfigSchema)
};

// 系统配置模型
const systemConfigSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  config: {
    general: {
      PORT: { type: String, default: '3001' },
      LOG_LEVEL: { type: String, default: 'info' },
      CSV_MAX_SIZE: { type: String, default: '50MB' },
      CSV_ENCODING: { type: String, default: 'utf-8' }
    },
    scan: {
      SCAN_ENABLED: { type: String, default: 'true' },
      SCAN_CRON: { type: String, default: '30 4 * * *' },
      SCAN_TIMEOUT: { type: String, default: '30000' },
      SCAN_BATCH_SIZE: { type: String, default: '10' }
    },
    ssl: {
      SSL_SCAN_ENABLED: { type: String, default: 'true' },
      SSL_SCAN_CRON: { type: String, default: '0 5 * * *' },
      SSL_SCAN_TIMEOUT: { type: String, default: '20000' },
      SSL_SCAN_BATCH_SIZE: { type: String, default: '5' },
      SSL_CRITICAL_DAYS: { type: String, default: '7' },
      SSL_WARNING_DAYS: { type: String, default: '30' },
      SSL_ATTENTION_DAYS: { type: String, default: '60' }
    },
    alert: {
      ALERT_ENABLED: { type: String, default: 'true' },
      ALERT_CRON: { type: String, default: '0 12 * * *' }
    },
    advanced: {
      EVAL_URGENT_DAYS: { type: String, default: '7' },
      EVAL_SUGGEST_DAYS: { type: String, default: '30' },
      EVAL_ATTENTION_DAYS: { type: String, default: '90' }
    }
  },
  updatedBy: String
}, { timestamps: true });

module.exports.SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);
