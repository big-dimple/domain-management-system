import { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { 
  ArrowUpTrayIcon, 
  ArrowDownTrayIcon,
  DocumentArrowUpIcon // 替换了 DocumentCheckIcon
} from '@heroicons/react/24/outline';

export default function DomainImportExport({ onImport, onExport }) {
  const [selectedFile, setSelectedFile] = useState(null); // 用于存储选择的文件对象
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null); // 存储导入结果
  const fileInputRef = useRef(null); // 用于重置文件输入框

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setImportResults(null); // 清除上一次的导入结果
      } else {
        toast.error('文件格式无效，请选择CSV文件。');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = ''; // 重置文件输入
      }
    } else {
      setSelectedFile(null);
    }
  };
  
  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('请先选择要导入的CSV文件。');
      return;
    }
    
    setIsImporting(true);
    setImportResults(null); 
    
    try {
      const result = await onImport(selectedFile); // onImport 是从 props 传递的 store action
      
      if (result.success) {
        setImportResults(result.data); // result.data 应该包含 { total, success, updated, failed, errors }
        toast.success(`导入完成: ${result.data.success || 0}条新增, ${result.data.updated || 0}条更新, ${result.data.failed || 0}条失败。`);
      } else {
        // API 拦截器可能已经弹了 toast，这里可以显示更具体的错误或汇总
        const errorMsg = result.error || '导入过程中发生未知错误。';
        setImportResults(result.data || { total:0, success:0, updated:0, failed: (result.data?.total || 1), errors: [{ domainName: '文件级别错误', error: errorMsg }] });
        toast.error(`导入失败: ${errorMsg}`);
      }
    } catch (error) {
      const errorMsg = error.message || '客户端导入请求失败。';
      setImportResults({ errors: [{ domainName: '请求错误', error: errorMsg }] });
      toast.error(`导入请求失败: ${errorMsg}`);
    } finally {
      setIsImporting(false);
      // 成功或失败后不清空 selectedFile，用户可能想看文件名
      // 如果需要每次导入后清空，可以在这里加:
      // setSelectedFile(null);
      // if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  const handleExport = async () => {
    // loading 状态由 domainStore 内部控制 (如果 onExport 是异步 action)
    try {
      await onExport(); // onExport 是从 props 传递的 store action
      // toast 提示已在 domainStore 的 exportCsv action 中处理
    } catch (error) {
      // toast.error('导出CSV文件失败。'); // 通常也在 store action 中处理
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">数据导入/导出</h3>
          <p className="mt-1 text-sm text-gray-500">
            通过CSV文件批量导入域名，或导出当前所有域名数据。
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4 sm:flex-shrink-0 flex flex-col sm:flex-row sm:items-center gap-2">
          {/* 隐藏的原生文件输入框 */}
          <input
            type="file"
            id="csv-file-input"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="sr-only"
          />
          {/* 自定义文件选择按钮 */}
          <button
            type="button"
            onClick={handleTriggerFileInput}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <ArrowUpTrayIcon className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-500" aria-hidden="true" />
            选择CSV文件
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            <DocumentArrowUpIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            {isImporting ? '正在导入...' : '开始导入'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            <ArrowDownTrayIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            导出为CSV
          </button>
        </div>
      </div>
      
      {selectedFile && (
        <div className="mt-3 text-sm text-gray-700">
          已选择文件: <span className="font-medium text-indigo-600">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(2)} KB)
        </div>
      )}
      
      {importResults && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h4 className="text-md font-semibold text-gray-800 mb-2">导入结果:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>总处理行数: <span className="font-bold">{importResults.total || 0}</span></div>
            <div className="text-green-600">成功新增: <span className="font-bold">{importResults.success || 0}</span></div>
            <div className="text-blue-600">成功更新: <span className="font-bold">{importResults.updated || 0}</span></div>
            <div className="text-red-600">导入失败: <span className="font-bold">{importResults.failed || 0}</span></div>
          </div>
          
          {importResults.errors && importResults.errors.length > 0 && (
            <div className="mt-3">
              <h5 className="text-sm font-semibold text-red-700">错误详情:</h5>
              <ul className="mt-1 list-disc list-inside text-xs text-red-600 max-h-32 overflow-y-auto bg-red-50 p-2 rounded">
                {importResults.errors.map((err, index) => (
                  <li key={index}>
                    {err.domainName ? `域名 "${err.domainName}": ` : `行 ${err.row || index + 1}: `} {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
