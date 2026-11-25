import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, InboxIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  /** Present to make the column sortable. */
  sort?: (row: T) => string | number;
  className?: string;
  align?: 'right';
}

/** Sortable, paginated table in the Access360 card style. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  pageSize = 10,
  emptyTitle = 'Nothing to show',
  emptyDescription,
  emptyAction,
  initialSort
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  initialSort?: {key: string;dir: 'asc' | 'desc';};
}) {
  const [sort, setSort] = useState<{key: string;dir: 'asc' | 'desc';} | null>(initialSort ?? null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (page > pages) setPage(pages);
  }, [rows.length, pageSize, page]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const get = col.sort;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
      return sort.dir === 'asc' ? r : -r;
    });
  }, [rows, sort, columns]);

  if (rows.length === 0) {
    return <EmptyState icon={InboxIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  const visible = sorted.slice((page - 1) * pageSize, page * pageSize);
  const toggle = (key: string) =>
  setSort((s) => s?.key === key ? s.dir === 'asc' ? { key, dir: 'desc' } : null : { key, dir: 'asc' });

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50/70">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const Icon = !active ? ArrowUpDownIcon : sort!.dir === 'asc' ? ArrowUpIcon : ArrowDownIcon;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? sort!.dir === 'asc' ? 'ascending' : 'descending' : undefined}
                    className={twMerge('px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted', c.align === 'right' && 'text-right', c.className)}>
                    {c.sort ?
                    <button type="button" onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 uppercase hover:text-ink">
                        {c.header}
                        <Icon className={twMerge('h-3 w-3', active ? 'text-brand-600' : 'text-subtle')} />
                      </button> :
                    c.header}
                  </th>);

              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((row) =>
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={twMerge('transition-colors duration-150', onRowClick && 'cursor-pointer hover:bg-slate-50')}>
                {columns.map((c) =>
              <td key={c.key} className={twMerge('px-4 py-3 align-middle text-[13px] text-ink', c.align === 'right' && 'text-right', c.className)}>
                    {c.render(row)}
                  </td>
              )}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > pageSize && <Pagination className="mt-3" page={page} pageSize={pageSize} total={rows.length} onChange={setPage} />}
    </div>);

}
