import React, { useState } from 'react';
import { 
  BookOpen, FileText, AlertCircle, Settings, 
  HelpCircle, ChevronRight, ChevronDown, 
  Globe, Shield, Download, Upload, RefreshCw
} from 'lucide-react';

export const HelpPage = () => {
  const [activeSection, setActiveSection] = useState('quickstart');
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = (key) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const sections = [
    { id: 'quickstart', label: '快速开始', icon: BookOpen },
    { id: 'features', label: '功能说明', icon: FileText },
    { id: 'csv', label: '数据导入导出', icon: FileText },
    { id: 'alerts', label: '告警配置', icon: AlertCircle },
    { id: 'settings', label: '系统设置', icon: Settings },
    { id: 'faq', label: '常见问题', icon: HelpCircle }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">帮助文档</h1>
        <p className="text-gray-600">域名管理系统 v3.0 使用指南</p>
      </div>

      <div className="flex gap-6">
        {/* 左侧导航 */}
        <div className="w-64 flex-shrink-0">
          <div className="card p-4">
            <nav className="space-y-1">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1">
          <div className="card p-6">
            {activeSection === 'quickstart' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">快速开始</h2>
                <div className="space-y-6">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="text-lg font-medium mb-2">🚀 第一步：添加您的域名</h3>
                    <p className="text-gray-600 mb-3">
                      开始使用域名管理系统，您需要先添加要监控的域名。
                    </p>
                    <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                      <li>进入"域名管理"页面</li>
                      <li>点击"添加域名"按钮</li>
                      <li>填写域名信息：
                        <ul className="list-disc list-inside ml-4 mt-1">
                          <li>域名地址（如 example.com）</li>
                          <li>到期日期（系统会自动扫描更新）</li>
                          <li>持有者信息（公司或部门）</li>
                          <li>业务用途（帮助评估域名价值）</li>
                          <li>ICP备案信息（如有）</li>
                        </ul>
                      </li>
                      <li>点击"保存"完成添加</li>
                    </ol>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="text-lg font-medium mb-2">📊 第二步：批量导入域名</h3>
                    <p className="text-gray-600 mb-3">
                      如果您有大量域名需要管理，可以使用CSV批量导入功能。
                    </p>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-700 mb-2">CSV格式示例：</p>
                      <code className="block bg-white p-2 rounded text-xs">
                        域名,域名类型,到期日期,持有者,业务使用,ICP证,续费价格,备注<br/>
                        example.com,gTLD,2025-12-31,示例公司,公司官网,京ICP备12345678号,100元/年,核心域名
                      </code>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      💡 提示：系统提供了 import_template.csv 模板文件供参考。
                    </p>
                  </div>

                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h3 className="text-lg font-medium mb-2">🔔 第三步：配置告警通知</h3>
                    <p className="text-gray-600 mb-3">
                      设置自动告警，确保不会错过任何域名续费。
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>支持钉钉、企业微信机器人</li>
                      <li>自定义提前告警天数</li>
                      <li>每日定时推送到期提醒</li>
                      <li>可手动触发即时告警</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">💡 快速提示</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• 使用"批量扫描"功能自动更新所有域名的到期日期</li>
                      <li>• 系统会根据域名价值和到期时间智能推荐续费建议</li>
                      <li>• SSL证书监控功能可以帮您管理HTTPS证书</li>
                      <li>• 定期查看仪表盘了解整体状态</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'features' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">功能说明</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <Globe className="w-5 h-5 mr-2 text-blue-500" />
                      域名管理功能
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">🔍 域名扫描</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 自动获取域名真实到期时间</li>
                          <li>• 使用WHOIS协议查询</li>
                          <li>• 支持批量扫描</li>
                          <li>• 每日凌晨4:30自动执行</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">💡 续费建议</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 智能评估域名价值</li>
                          <li>• 根据到期时间分类</li>
                          <li>• 提供续费决策参考</li>
                          <li>• 支持自定义规则</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">📊 数据管理</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• CSV批量导入导出</li>
                          <li>• 支持多种编码格式</li>
                          <li>• 智能识别分隔符</li>
                          <li>• 数据完整性校验</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">🏷️ 域名分类</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 按业务用途分组</li>
                          <li>• 标记特殊价值域名</li>
                          <li>• 支持ICP备案标记</li>
                          <li>• 自定义备注信息</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-green-500" />
                      SSL证书监控
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">🔐 证书检测</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 实时检测证书状态</li>
                          <li>• 自动识别证书信息</li>
                          <li>• 支持通配符证书</li>
                          <li>• 每日凌晨5:00自动扫描</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">⏰ 到期提醒</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 证书到期倒计时</li>
                          <li>• 分级告警（紧急/警告/正常）</li>
                          <li>• 自定义提醒时间</li>
                          <li>• 支持批量监控</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2 text-yellow-500" />
                      告警中心
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">统一告警管理</h4>
                        <p className="text-sm text-gray-700">
                          将域名和SSL证书的到期提醒整合到一个统一的告警中心，支持多种通知渠道，确保重要信息不被遗漏。
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="border border-gray-200 p-3 rounded">
                          <h5 className="font-medium text-sm mb-1">钉钉机器人</h5>
                          <p className="text-xs text-gray-600">支持群组推送</p>
                        </div>
                        <div className="border border-gray-200 p-3 rounded">
                          <h5 className="font-medium text-sm mb-1">企业微信</h5>
                          <p className="text-xs text-gray-600">支持webhook</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'csv' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">数据导入导出</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">📥 域名数据导入（CSV格式）</h3>
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium text-blue-900 mb-2">CSV文件格式要求</h4>
                      <p className="text-sm text-blue-800 mb-2">必须包含以下列头（顺序可调整）：</p>
                      <code className="block bg-white p-3 rounded text-xs border border-blue-200">
                        域名,域名类型,到期日期,持有者,业务使用,ICP证,续费价格,备注
                      </code>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium mb-2">📋 示例数据</h4>
                        <div className="bg-gray-100 p-3 rounded-md overflow-x-auto">
                          <code className="text-xs">
                            域名,域名类型,到期日期,持有者,业务使用,ICP证,续费价格,备注<br/>
                            example.com,gTLD,2025-12-31,示例公司,公司官网,京ICP备12345678号,100元/年,核心域名<br/>
                            api.example.com,gTLD,2025-08-20,示例公司,API服务,京ICP备12345678号-1,100元/年,重要服务<br/>
                            test.cn,ccTLD,2025-06-30,测试部门,测试环境,无,50元/年,可评估价值
                          </code>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">💡 导入提示</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 支持UTF-8、GBK等常见编码</li>
                          <li>• 自动识别逗号、分号、制表符等分隔符</li>
                          <li>• 日期格式支持：YYYY-MM-DD、YYYY/MM/DD等</li>
                          <li>• 重复域名将更新而非新增</li>
                          <li>• 单次导入建议不超过1000条</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-3">📤 域名数据导出</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      导出功能会生成包含所有域名信息的CSV文件，包括扫描状态和续费建议。
                    </p>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">导出内容包括</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>✓ 所有域名基本信息</li>
                        <li>✓ 最新扫描结果</li>
                        <li>✓ 续费建议</li>
                        <li>✓ 扫描状态和时间</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-3">📝 SSL监控列表（TXT格式）</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">导入格式</h4>
                        <div className="bg-gray-100 p-3 rounded-md">
                          <code className="text-xs">
                            example.com<br/>
                            api.example.com<br/>
                            *.example.com<br/>
                            www.example.com<br/>
                            blog.example.com
                          </code>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          每行一个域名，支持通配符域名
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">注意事项</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 域名格式要正确</li>
                          <li>• 确保域名已配置SSL</li>
                          <li>• 导入后自动开始扫描</li>
                          <li>• 扫描使用443端口</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'alerts' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">告警配置</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">🤖 配置机器人告警</h3>
                    
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium text-blue-900 mb-2">通用配置流程</h4>
                      <p className="text-sm text-blue-800 mb-2">所有平台的配置流程基本相同：</p>
                      <ol className="text-sm text-blue-800 space-y-1">
                        <li>1. 进入对应平台的群聊设置</li>
                        <li>2. 找到机器人/群助手功能</li>
                        <li>3. 创建自定义机器人</li>
                        <li>4. 获取Webhook地址</li>
                        <li>5. 在系统中添加告警配置</li>
                      </ol>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium mb-3 text-blue-600 flex items-center">
                          <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                          钉钉机器人
                        </h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 群设置 → 智能群助手</li>
                          <li>• 添加机器人 → 自定义</li>
                          <li>• 支持关键词验证</li>
                          <li>• 支持IP白名单</li>
                        </ul>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium mb-3 text-green-600 flex items-center">
                          <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                          企业微信机器人
                        </h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 群设置 → 群机器人</li>
                          <li>• 添加机器人 → 创建</li>
                          <li>• 支持@指定成员</li>
                          <li>• 支持消息加密</li>
                        </ul>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium mb-3 text-purple-600 flex items-center">
                          <span className="w-2 h-2 bg-purple-600 rounded-full mr-2"></span>
                          飞书机器人
                        </h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 群设置 → 群机器人</li>
                          <li>• 添加机器人 → 自定义</li>
                          <li>• 支持签名验证</li>
                          <li>• 支持富文本消息</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-3">⚙️ 告警规则设置</h3>
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">时间规则</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 域名默认提前30天告警</li>
                          <li>• SSL证书默认提前14天告警</li>
                          <li>• 可为每个告警配置单独设置</li>
                          <li>• 支持1-365天范围调整</li>
                        </ul>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">执行规则</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 每天中午12:00自动执行</li>
                          <li>• 可手动触发立即告警</li>
                          <li>• 同一内容24小时内不重复发送</li>
                          <li>• 支持启用/禁用单个配置</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-3">📊 告警内容示例</h3>
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <pre className="text-xs whitespace-pre-wrap">
【域名到期提醒】

🔴 紧急续费：
  • example.com - 2024-06-15 (5天)
  • api.example.com - 2024-06-18 (8天)

🟢 建议续费：
  • test.example.com - 2024-07-10 (30天)

🟡 请示领导：
  • old-site.com - 2024-06-25 (15天)

【SSL证书到期提醒】

🔴 紧急处理：
  • shop.example.com - 2024-06-20 (10天)

🟡 即将到期：
  • blog.example.com - 2024-07-05 (25天)
                      </pre>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">💡 最佳实践</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• 建议创建多个告警配置，分别发送到不同群组</li>
                      <li>• 重要域名可设置更长的提前告警时间</li>
                      <li>• 定期测试告警配置确保正常工作</li>
                      <li>• 合理设置告警频率，避免信息过载</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'settings' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">系统设置</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">评估设置</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      可以自定义续费建议的评估标准，调整不同阶段的天数阈值。
                    </p>
                    <div className="bg-blue-50 p-4 rounded">
                      <h4 className="font-medium text-blue-900 mb-2">域名评估阈值</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• 紧急续费：默认7天</li>
                        <li>• 建议续费：默认30天</li>
                        <li>• 保持续费：默认90天</li>
                      </ul>
                    </div>
                    <div className="bg-green-50 p-4 rounded mt-3">
                      <h4 className="font-medium text-green-900 mb-2">SSL证书评估阈值</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• 紧急状态：7天内到期</li>
                        <li>• 警告状态：7-30天内到期</li>
                        <li>• 正常状态：30天以上</li>
                        <li>• 访问不通：无法连接到服务器</li>
                        <li>• 已过期：证书超过有效期</li>
                        <li>• 自动续期的证书会特别标注</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-3">定时任务</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      系统自动执行的定时任务：
                    </p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">任务名称</th>
                          <th className="text-left py-2">执行时间</th>
                          <th className="text-left py-2">说明</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2">域名扫描</td>
                          <td className="py-2">每天 04:30</td>
                          <td className="py-2 text-gray-600">自动更新域名到期信息</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2">SSL扫描</td>
                          <td className="py-2">每天 05:00</td>
                          <td className="py-2 text-gray-600">检测SSL证书状态</td>
                        </tr>
                        <tr>
                          <td className="py-2">告警通知</td>
                          <td className="py-2">每天 12:00</td>
                          <td className="py-2 text-gray-600">发送到期提醒</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'faq' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">常见问题</h2>
                
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleExpand('faq1')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
                    >
                      <span className="font-medium">为什么有些域名扫描失败？</span>
                      {expandedItems.faq1 ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    {expandedItems.faq1 && (
                      <div className="px-4 pb-4 text-sm text-gray-600">
                        <p>可能的原因包括：</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>域名注册商限制了WHOIS查询频率</li>
                          <li>某些域名后缀不支持标准WHOIS协议</li>
                          <li>网络连接问题导致查询超时</li>
                        </ul>
                        <p className="mt-2">建议：手动维护这些域名的到期日期，或稍后重试扫描。</p>
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleExpand('faq2')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
                    >
                      <span className="font-medium">如何修改定时任务的执行时间？</span>
                      {expandedItems.faq2 ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    {expandedItems.faq2 && (
                      <div className="px-4 pb-4 text-sm text-gray-600">
                        <p>需要修改环境变量文件 .env 中的相关配置：</p>
                        <div className="bg-gray-100 p-3 rounded mt-2 font-mono text-xs">
                          <p>SCAN_CRON=30 4 * * *  # 域名扫描时间</p>
                          <p>SSL_SCAN_CRON=0 5 * * *  # SSL扫描时间</p>
                          <p>ALERT_CRON=0 12 * * *  # 告警时间</p>
                        </div>
                        <p className="mt-2">修改后需要重启系统才能生效。</p>
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleExpand('faq3')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
                    >
                      <span className="font-medium">SSL证书扫描失败怎么办？</span>
                      {expandedItems.faq3 ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    {expandedItems.faq3 && (
                      <div className="px-4 pb-4 text-sm text-gray-600">
                        <p>SSL证书扫描失败可能因为：</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>域名未配置SSL证书</li>
                          <li>使用了非标准端口（不是443）</li>
                          <li>防火墙阻止了访问</li>
                          <li>证书配置有误</li>
                        </ul>
                        <p className="mt-2">您可以手动添加证书信息，或检查域名的SSL配置。</p>
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleExpand('faq4')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
                    >
                      <span className="font-medium">如何备份和恢复数据？</span>
                      {expandedItems.faq4 ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    {expandedItems.faq4 && (
                      <div className="px-4 pb-4 text-sm text-gray-600">
                        <p>备份数据：</p>
                        <div className="bg-gray-100 p-3 rounded mt-2 font-mono text-xs">
                          ./backup.sh
                        </div>
                        <p className="mt-2">备份文件保存在 backups 目录下。</p>
                        <p className="mt-2">恢复数据：</p>
                        <div className="bg-gray-100 p-3 rounded mt-2 font-mono text-xs">
                          docker exec -i mongodb mongorestore --archive &lt; backup_file.gz
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleExpand('faq5')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
                    >
                      <span className="font-medium">支持哪些域名后缀？</span>
                      {expandedItems.faq5 ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    {expandedItems.faq5 && (
                      <div className="px-4 pb-4 text-sm text-gray-600">
                        <p>理论上支持所有提供WHOIS查询的域名后缀，包括：</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>通用顶级域名：.com、.net、.org、.info等</li>
                          <li>国家顶级域名：.cn、.uk、.de、.jp等</li>
                          <li>新顶级域名：.app、.dev、.cloud等</li>
                        </ul>
                        <p className="mt-2">某些特殊后缀可能需要手动维护。</p>
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleExpand('faq6')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
                    >
                      <span className="font-medium">续费建议是如何计算的？</span>
                      {expandedItems.faq6 ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    {expandedItems.faq6 && (
                      <div className="px-4 pb-4 text-sm text-gray-600">
                        <p>系统根据以下因素智能计算续费建议：</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li><strong>域名价值</strong>：是否有业务使用、ICP备案、特殊标记等</li>
                          <li><strong>到期时间</strong>：距离到期日期的天数</li>
                          <li><strong>评估规则</strong>：可在系统设置中自定义</li>
                        </ul>
                        <div className="bg-gray-100 p-3 rounded mt-3">
                          <p className="text-xs font-medium mb-1">续费建议类型：</p>
                          <ul className="text-xs space-y-1">
                            <li>🔴 紧急续费 - 有价值且即将到期</li>
                            <li>🟢 建议续费 - 有价值，时间尚可</li>
                            <li>🔵 保持续费 - 有价值，时间充裕</li>
                            <li>🟡 请示领导 - 价值不明，需决策</li>
                            <li>⚪ 待评估 - 时间充裕，暂不急</li>
                            <li>⚫ 不续费 - 手动标记不续费</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleExpand('faq7')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
                    >
                      <span className="font-medium">如何处理CSV导入乱码？</span>
                      {expandedItems.faq7 ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    {expandedItems.faq7 && (
                      <div className="px-4 pb-4 text-sm text-gray-600">
                        <p>系统支持自动识别编码，但如果仍有乱码：</p>
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                          <li>确保CSV文件使用UTF-8编码</li>
                          <li>使用Excel保存时选择"CSV UTF-8"格式</li>
                          <li>检查是否有特殊字符</li>
                          <li>尝试使用记事本另存为UTF-8格式</li>
                        </ol>
                        <p className="mt-2">💡 建议使用系统提供的模板文件作为基础。</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
