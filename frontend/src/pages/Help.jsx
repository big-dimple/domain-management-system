import React from 'react';
import {
  QuestionMarkCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const Help = () => {
  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">帮助说明</h1>

      {/* 续费标准部分 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <QuestionMarkCircleIcon className="w-6 h-6 mr-2 text-primary-600" />
          域名续费标准
        </h2>
        <div className="space-y-4">
          <p className="text-gray-700">以下域名需要续费：</p>
          <ul className="space-y-2 ml-6">
            <li className="flex items-start">
              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">业务在用的域名</span>
            </li>
            <li className="flex items-start">
              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">ICP证挂钩的域名</span>
            </li>
            <li className="flex items-start">
              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">单个主体最后一个域名</span>
            </li>
            <li className="flex items-start">
              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">做了ICP备案的域名</span>
            </li>
            <li className="flex items-start">
              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">接了支付接口的域名</span>
            </li>
          </ul>

          <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>一票否决：</strong>公司主体计划放弃的不续。
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-700">
                  续费标准里的第4条"做了ICP备案的域名"，主要是考虑备案过程较久，新备案要一定周期而且要法人人脸识别等手续较为复杂。
                </p>
                <p className="text-sm text-amber-700 mt-2">
                  若确认半年内也不使用，那也可以放弃该域名。除非域名比较好听，比较简短稀有有保存价值的就续费。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 系统功能说明 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <InformationCircleIcon className="w-6 h-6 mr-2 text-primary-600" />
          系统功能说明
        </h2>
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-medium text-lg text-gray-800 mb-2">域名列表页</h3>
            <p className="text-gray-700">域名列表页是系统的首页，主要功能包括：</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-700">
              <li>查看所有域名信息，支持排序和筛选</li>
              <li>根据到期日期突出显示即将到期的域名</li>
              <li>添加、编辑和删除域名记录</li>
              <li>导入和导出CSV格式的域名信息</li>
              <li>手动触发域名到期日期检查</li>
            </ul>
          </div>

          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-medium text-lg text-gray-800 mb-2">仪表盘页</h3>
            <p className="text-gray-700">仪表盘页面展示域名管理的统计数据和可视化图表，包括：</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-700">
              <li>域名总数、即将到期数量等关键指标</li>
              <li>域名类型、持有者、使用情况等分布图</li>
              <li>未来到期趋势分析</li>
              <li>域名管理建议和预警</li>
            </ul>
          </div>

          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-medium text-lg text-gray-800 mb-2">历史记录页</h3>
            <p className="text-gray-700">历史记录页面记录所有域名操作的历史，包括：</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-700">
              <li>域名新增、更新、删除等操作记录</li>
              <li>记录操作类型、修改字段、修改前后的值</li>
              <li>记录操作人和操作时间</li>
              <li>支持按多种条件筛选和搜索历史记录</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-lg text-gray-800 mb-2">自动检查功能</h3>
            <p className="text-gray-700">系统会定期自动检查域名到期日期，更新数据库中的信息：</p>
            <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-700">
              <li>系统每天/每周自动运行域名检查任务</li>
              <li>使用WHOIS查询获取最新的域名到期日期</li>
              <li>对比数据库中的记录并更新不一致的信息</li>
              <li>支持手动触发检查任务</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 常见问题解答 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <QuestionMarkCircleIcon className="w-6 h-6 mr-2 text-primary-600" />
          常见问题解答
        </h2>
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-medium text-gray-800 mb-1">如何导入现有的域名数据？</h3>
            <p className="text-gray-700">
              在域名列表页面点击"导入CSV"按钮，上传符合格式要求的CSV文件即可。系统支持中文列名和英文列名，会自动匹配相应的字段。
            </p>
          </div>

          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-medium text-gray-800 mb-1">系统如何判断域名是否即将到期？</h3>
            <p className="text-gray-700">
              系统会根据域名的到期日期与当前日期进行比较，若到期日期在3个月内，会在界面上以黄色背景标记，并在仪表盘中显示预警信息。
            </p>
          </div>

          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-medium text-gray-800 mb-1">如何记录域名不续费的决策？</h3>
            <p className="text-gray-700">
              在编辑域名信息时，可以添加备注说明不续费的原因。系统会自动记录所有的修改历史，包括操作人和操作时间，可以在历史记录页面查看完整的操作记录。
            </p>
          </div>

          <div>
            <h3 className="font-medium text-gray-800 mb-1">自动检查域名到期日期的频率是多久？</h3>
            <p className="text-gray-700">
              系统默认每周自动检查一次所有域名的到期日期。您也可以在域名列表页面手动触发检查任务，立即更新域名信息。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
