const mongoose = require('mongoose');
const { Domain } = require('./models');

async function migrateICPField() {
  try {
    console.log('开始迁移ICP字段...');
    
    // 查找所有域名
    const domains = await Domain.find({});
    let migrated = 0;
    
    for (const domain of domains) {
      let shouldSave = false;
      
      // 如果存在旧的icpStatus字段
      if (domain.icpStatus !== undefined) {
        const icpValue = String(domain.icpStatus).trim().toLowerCase();
        domain.hasICP = icpValue && 
                       icpValue !== '无' && 
                       icpValue !== '否' && 
                       icpValue !== '' && 
                       icpValue !== 'null' && 
                       icpValue !== 'false';
        
        // 删除旧字段
        domain.icpStatus = undefined;
        shouldSave = true;
        migrated++;
      }
      
      // 如果hasICP字段不存在，设置默认值
      if (domain.hasICP === undefined) {
        domain.hasICP = false;
        shouldSave = true;
      }
      
      if (shouldSave) {
        await domain.save();
      }
    }
    
    console.log(`迁移完成，共处理 ${domains.length} 个域名，其中 ${migrated} 个域名的ICP字段被迁移`);
  } catch (error) {
    console.error('迁移失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:domain123456@localhost:27017/domains?authSource=admin', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    migrateICPField();
  });
}

module.exports = migrateICPField;
