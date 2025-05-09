import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useTable, useSortBy, useFilters, usePagination, useGlobalFilter } from 'react-table';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// 筛选器组件
function SelectColumnFilter({
  column: { filterValue, setFilter, preFilteredRows, id },
}) {
  const options = React.useMemo(() => {
    const optionsSet = new Set();
    preFilteredRows.forEach(row => {
      optionsSet.add(row.values[id]);
    });
    return [...optionsSet.values()];
  }, [id, preFilteredRows]);

  return (
    <select
      className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50 text-sm"
      value={filterValue}
      onChange={e => {
        setFilter(e.target.value || undefined);
      }}
    >
      <option value="">全部</option>
      {options.map((option, i) => (
        <option key={i} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

// 全局搜索组件
function GlobalFilter({ globalFilter, setGlobalFilter }) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
      </div>
      <input
        value={globalFilter || ''}
        onChange={e => setGlobalFilter(e.target.value || undefined)}
        placeholder="搜索所有记录..."
        className="pl-10 p-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );
}

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // 获取历史记录
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/history');
        setHistory(response.data);
      } catch (error) {
        console.error('获取历史记录失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // 表格列定义
  const columns = React.useMemo(
    () => [
      {
        Header: '域名',
        accessor: 'domainName',
        filter: 'fuzzyText',
      },
      {
        Header: '操作类型',
        accessor: 'action',
        Filter: SelectColumnFilter,
        filter: 'includes',
        Cell: ({ value }) => {
          let bgColor = 'bg-gray-100';
          let textColor = 'text-gray-800';
          
          switch (value) {
            case '新增':
              bgColor = 'bg-green-100';
              textColor = 'text-green-800';
              break;
            case '更新':
              bgColor = 'bg-blue-100';
              textColor = 'text-blue-800';
              break;
            case '删除':
              bgColor = 'bg-red-100';
              textColor = 'text-red-800';
              break;
            case '不续费':
              bgColor = 'bg-amber-100';
              textColor = 'text-amber-800';
              break;
            default:
              break;
          }
          
          return (
            <span className={`px-2 py-1 rounded-full text-xs ${bgColor} ${textColor}`}>
              {value}
            </span>
          );
        },
      },
      {
        Header: '修改字段',
        accessor: 'field',
        Filter: SelectColumnFilter,
        filter: 'includes',
      },
      {
        Header: '旧值',
        accessor: 'oldValue',
      },
      {
        Header: '新值',
        accessor: 'newValue',
      },
      {
        Header: '原因',
        accessor: 'reason',
      },
      {
        Header: '操作人',
        accessor: 'operatedBy',
        Filter: SelectColumnFilter,
        filter: 'includes',
      },
      {
        Header: '操作时间',
        accessor: 'operatedAt',
        Cell: ({ value }) => format(new Date(value), 'yyyy-MM-dd HH:mm:ss'),
        sortType: 'datetime',
      },
    ],
    []
  );

  // 使用React Table
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize, globalFilter },
    setGlobalFilter,
  } = useTable(
    {
      columns,
      data: history,
      initialState: { pageIndex: 0, pageSize: 15 },
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">域名操作历史记录</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <GlobalFilter globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} />
        </div>

        <div className="overflow-x-auto">
          <table
            {...getTableProps()}
            className="min-w-full divide-y divide-gray-200"
          >
            <thead className="bg-gray-50">
              {headerGroups.map(headerGroup => (
                <tr {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map(column => (
                    <th
                      {...column.getHeaderProps(column.getSortByToggleProps())}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <div className="flex items-center">
                        {column.render('Header')}
                        <span>
                          {column.isSorted ? (
                            column.isSortedDesc ? (
                              <ChevronDownIcon className="w-4 h-4 ml-1" />
                            ) : (
                              <ChevronUpIcon className="w-4 h-4 ml-1" />
                            )
                          ) : (
                            ''
                          )}
                        </span>
                      </div>
                      <div className="mt-1">
                        {!column.disableFilters ? column.render('Filter') : null}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody
              {...getTableBodyProps()}
              className="bg-white divide-y divide-gray-200"
            >
              {page.map(row => {
                prepareRow(row);
                return (
                  <tr {...row.getRowProps()} className="hover:bg-gray-50">
                    {row.cells.map(cell => {
                      return (
                        <td
                          {...cell.getCellProps()}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                        >
                          {cell.render('Cell')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 分页控件 */}
        <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              每页显示
            </span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
              }}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50 text-sm"
            >
              {[10, 15, 20, 30, 50].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-700">
              第 {pageIndex + 1} 页，共 {pageOptions.length} 页
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              className="px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => gotoPage(0)}
              disabled={!canPreviousPage}
            >
              首页
            </button>
            <button
              className="px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => previousPage()}
              disabled={!canPreviousPage}
            >
              上一页
            </button>
            <button
              className="px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => nextPage()}
              disabled={!canNextPage}
            >
              下一页
            </button>
            <button
              className="px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => gotoPage(pageCount - 1)}
              disabled={!canNextPage}
            >
              末页
            </button>
          </div>
        </div>
      </div>

      {/* 历史记录图例 */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-medium text-gray-700 mb-4">操作类型说明</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 mr-2">新增</span>
            <span className="text-sm text-gray-700">新增域名记录</span>
          </div>
          <div className="flex items-center">
            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 mr-2">更新</span>
            <span className="text-sm text-gray-700">更新域名信息</span>
          </div>
          <div className="flex items-center">
            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 mr-2">删除</span>
            <span className="text-sm text-gray-700">删除域名记录</span>
          </div>
          <div className="flex items-center">
            <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800 mr-2">不续费</span>
            <span className="text-sm text-gray-700">标记域名为不续费</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;
