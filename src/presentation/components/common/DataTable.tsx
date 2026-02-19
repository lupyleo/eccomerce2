'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/presentation/components/ui';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  pagination?: PaginationInfo;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onPageChange?: (page: number) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  loading?: boolean;
  emptyMessage?: string;
}

function SortIcon({ active, direction }: { active: boolean; direction?: 'asc' | 'desc' }) {
  return (
    <span className="inline-flex flex-col gap-px ml-1" aria-hidden="true">
      <svg
        className={cn('w-2.5 h-2.5', active && direction === 'asc' ? 'text-gray-900' : 'text-gray-300')}
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M5 0L10 6H0L5 0z" />
      </svg>
      <svg
        className={cn('w-2.5 h-2.5', active && direction === 'desc' ? 'text-gray-900' : 'text-gray-300')}
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M5 6L0 0H10L5 6z" />
      </svg>
    </span>
  );
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pagination,
  onSort,
  onPageChange,
  sortKey,
  sortDirection,
  loading = false,
  emptyMessage = '데이터가 없습니다.',
}: DataTableProps<T>) {
  const handleSort = (col: Column<T>) => {
    if (!col.sortable || !onSort) return;
    const nextDir: 'asc' | 'desc' =
      sortKey === col.key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(col.key, nextDir);
  };

  const renderPageNumbers = () => {
    if (!pagination) return null;
    const { page, totalPages } = pagination;

    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="relative overflow-x-auto rounded-lg border border-border">
        {loading && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10 rounded-lg">
            <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" aria-label="로딩중" />
          </div>
        )}

        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 font-medium text-gray-600 whitespace-nowrap',
                    col.sortable && onSort && 'cursor-pointer select-none hover:text-gray-900',
                    col.className,
                  )}
                  onClick={() => handleSort(col)}
                  aria-sort={
                    col.sortable && sortKey === col.key
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  <span className="inline-flex items-center">
                    {col.header}
                    {col.sortable && onSort && (
                      <SortIcon active={sortKey === col.key} direction={sortDirection} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={String(row.id ?? rowIndex)}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3', col.className)}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">
            총 <span className="font-medium text-foreground">{pagination.total.toLocaleString()}</span>건
            &nbsp;/ 페이지{' '}
            <span className="font-medium text-foreground">{pagination.page}</span>
            {' '}/ {pagination.totalPages}
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              aria-label="이전 페이지"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>

            {renderPageNumbers()?.map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange?.(p)}
                  className={cn(
                    'w-8 h-8 rounded-md text-sm font-medium transition-colors',
                    p === pagination.page
                      ? 'bg-gray-900 text-white'
                      : 'hover:bg-accent text-gray-600',
                  )}
                  aria-label={`${p}페이지`}
                  aria-current={p === pagination.page ? 'page' : undefined}
                >
                  {p}
                </button>
              ),
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              aria-label="다음 페이지"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
