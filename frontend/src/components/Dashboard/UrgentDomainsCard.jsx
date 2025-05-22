import { CalendarDaysIcon, ExclamationTriangleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'; // 更新图标
import dayjs from 'dayjs';
import { Link } from 'react-router-dom'; // 用于链接到域名详情

export default function UrgentDomainsCard({ domains }) {
  if (!domains || domains.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow h-full min-h-[20rem] flex flex-col items-center justify-center">
        <ShieldCheckIcon className="h-12 w-12 text-green-500 mb-3" /> {/* 使用Heroicons的图标 */}
        <p className="text-gray-600 text-md font-medium">太棒了！</p>
        <p className="text-gray-500 text-sm">当前没有需要紧急关注的域名。</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow h-full min-h-[20rem] flex flex-col">
      <div className="flex items-center mb-4">
        <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">紧急关注的域名</h3>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        以下是30天内到期且系统建议续费的域名，请及时处理。
      </p>
      
      <div className="flex-grow overflow-y-auto -mr-2 pr-2"> {/* 添加内边距和负外边距以美化滚动条 */}
        <ul role="list" className="divide-y divide-gray-200">
          {domains.map((domain) => (
            <li key={domain._id} className="py-3 hover:bg-gray-50 px-1 -mx-1 rounded">
              <Link to={`/domains?search=${domain.domainName}`} className="block"> {/* 假设可以搜索跳转 */}
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-indigo-600 truncate hover:text-indigo-800" title={domain.domainName}>
                      {domain.domainName}
                    </p>
                    <p className="text-xs text-gray-500 truncate" title={domain.holder}>
                      持有者: {domain.holder || 'N/A'}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex flex-col items-end">
                    <div className="flex items-center text-sm text-red-600">
                      <CalendarDaysIcon className="flex-shrink-0 mr-1 h-4 w-4 text-red-500" />
                      <p>
                        {dayjs(domain.expiryDate).format('YYYY/MM/DD')}
                      </p>
                    </div>
                    <p className="text-xs text-red-500 font-medium">
                       ({dayjs(domain.expiryDate).diff(dayjs(), 'day')}天后到期)
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
