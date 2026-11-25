import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FilterIcon,
  InboxIcon } from
'lucide-react';
import { twMerge } from 'tailwind-merge';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';
import { Button } from './Button';
import { Input, Select } from './Field';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  /** Present to make the column sortable. */
  sort?: (row: T) => string | number;
  /** Adds a funnel in the header: a text search or a pick-list of the values present. */
  filter?: 'text' | 'select';
  /** Text the filter matches against. Defaults to the sort value. */
  filterValue?: (row: T) => string;
  /** Label for the filter popover, e.g. "notes" gives "Search by notes". */
  filterLabel?: string;
  /** Used in the Columns menu. Defaults to the header when it is a string. */
  title?: string;
  className?: string;
  align?: 'right';
  /** Hidden until switched on in the Columns menu. */
  defaultHidden?: boolean;
}

export interface TableContext<T> {
  /** Rows after column filters. */
  rows: T[];
  selected: T[];
  clearSelection: () => void;
}

function HeaderFilter({
  label,
  type,
  options,
  value,
  onApply
}: {label: string;type: 'text' | 'select';options: string[];value: string;onApply: (v: string) => void;}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setDraft(value), [value, open]);
  useEffect(() => {
    if (!open) return undefined;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block normal-case">
      <button
        type="button"
        aria-label={`Filter by ${label}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={twMerge('rounded p-1 transition-colors hover:bg-slate-100', value ? 'text-brand-600' : 'text-subtle')}>
        <FilterIcon className="h-3.5 w-3.5" fill={value ? 'currentColor' : 'none'} />
      </button>
      {open &&
      <div className="absolute left-0 top-8 z-30 w-60 rounded-xl border border-line bg-white p-3 text-left shadow-pop">
          <p className="mb-2 text-[13px] font-semibold text-ink">{type === 'text' ? `Search by ${label}` : `Filter by ${label}`}</p>
          {type === 'text' ?
        <Input
          autoFocus
          className="h-9"
          placeholder={`Search ${label}...`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {if (e.key === 'Enter') {onApply(draft);setOpen(false);}}} /> :
        <Select className="h-9" value={draft} onChange={(e) => setDraft(e.target.value)}>
              <option value="">All</option>
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
        }
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="primary" onClick={() => {onApply(draft);setOpen(false);}}>Apply</Button>
            <Button size="sm" onClick={() => {onApply('');setOpen(false);}}>Clear</Button>
          </div>
        </div>
      }
    </div>);

}

function ColumnsMenu({ items, hidden, onToggle }: {items: {key: string;title: string;}[];hidden: string[];onToggle: (key: string) => void;}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <Button onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Columns <ChevronDownIcon className="h-4 w-4" />
      </Button>
      {open &&
      <ul className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-line bg-white py-1 shadow-pop">
          {items.map((c) =>
        <li key={c.key}>
              <button type="button" onClick={() => onToggle(c.key)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink hover:bg-slate-50">
                <span className={twMerge('flex h-4 w-4 items-center justify-center rounded border', hidden.includes(c.key) ? 'border-slate-300' : 'border-brand-500 bg-brand-500 text-ink')}>
                  {!hidden.includes(c.key) && <CheckIcon className="h-3 w-3" />}
                </span>
                {c.title}
              </button>
            </li>
        )}
        </ul>
      }
    </div>);

}

const checkboxCls = 'h-4 w-4 shrink-0 rounded border-slate-300 text-brand-500 focus:ring-brand-200';

/** Sortable, filterable, selectable, paginated table in the Access360 card style. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  pageSize = 10,
  emptyTitle = 'Nothing to show',
  emptyDescription,
  emptyAction,
  initialSort,
  selectable,
  toolbar,
  columnsMenu,
  expandable,
  onSelectionChange
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
  /** Adds a checkbox column and a "Select all" row. */
  selectable?: boolean;
  /** Rendered above the table, e.g. search, Export and Delete Selected. */
  toolbar?: (ctx: TableContext<T>) => React.ReactNode;
  /** Adds a Columns menu to show or hide columns. */
  columnsMenu?: boolean;
  /** Rows get a chevron that reveals extra content under the row. */
  expandable?: {render: (row: T) => React.ReactNode;};
  /** Called whenever the checked rows change. */
  onSelectionChange?: (rows: T[]) => void;
}) {
  const [sort, setSort] = useState<{key: string;dir: 'asc' | 'desc';} | null>(initialSort ?? null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [hidden, setHidden] = useState<string[]>(() => columns.filter((c) => c.defaultHidden).map((c) => c.key));
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);

  const textOf = (c: Column<T>, r: T) => c.filterValue ? c.filterValue(r) : c.sort ? String(c.sort(r)) : '';

  const filtered = useMemo(() => rows.filter((r) =>
  columns.every((c) => {
    const f = filters[c.key];
    if (!f) return true;
    const v = textOf(c, r);
    return c.filter === 'select' ? v === f : v.toLowerCase().includes(f.toLowerCase());
  })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [rows, filters, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return filtered;
    const get = col.sort;
    return [...filtered].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
      return sort.dir === 'asc' ? r : -r;
    });
  }, [filtered, sort, columns]);

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
    if (page > pages) setPage(pages);
  }, [sorted.length, pageSize, page]);

  // Keep the selection to rows that still exist.
  const existing = useMemo(() => new Set(rows.map(rowKey)), [rows, rowKey]);
  const selected = rows.filter((r) => selectedKeys.includes(rowKey(r)) && existing.has(rowKey(r)));

  const selectionSig = selected.map(rowKey).join('|');
  const notify = useRef(onSelectionChange);
  notify.current = onSelectionChange;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  useEffect(() => {
    notify.current?.(rowsRef.current.filter((r) => selectionSig.split('|').includes(rowKey(r))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionSig]);

  if (rows.length === 0) {
    return (
      <div>
        {toolbar?.({ rows: [], selected: [], clearSelection: () => undefined })}
        <EmptyState icon={InboxIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>);

  }

  const shown = columns.filter((c) => !hidden.includes(c.key));
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize);
  const toggleSort = (key: string) =>
  setSort((s) => s?.key === key ? s.dir === 'asc' ? { key, dir: 'desc' } : null : { key, dir: 'asc' });
  const allSelected = filtered.length > 0 && filtered.every((r) => selectedKeys.includes(rowKey(r)));
  const toggleAll = () => setSelectedKeys(allSelected ? [] : filtered.map(rowKey));
  const toggleRow = (k: string) => setSelectedKeys((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k]);
  const colCount = shown.length + (selectable ? 1 : 0) + (expandable ? 1 : 0);
  const menuItems = columns.filter((c) => c.key !== 'actions').map((c) => ({ key: c.key, title: c.title ?? (typeof c.header === 'string' ? c.header : c.key) }));

  return (
    <div>
      {toolbar?.({ rows: filtered, selected, clearSelection: () => setSelectedKeys([]) })}
      {(selectable || columnsMenu) &&
      <div className="mb-3 flex items-center justify-between gap-3">
          {selectable ?
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-[13px] font-medium text-brand-700">
              <input type="checkbox" className={checkboxCls} checked={allSelected} onChange={toggleAll} aria-label="Select all" />
              Select all ({filtered.length})
            </label> :
        <span />}
          {columnsMenu && <ColumnsMenu items={menuItems} hidden={hidden} onToggle={(k) => setHidden((h) => h.includes(k) ? h.filter((x) => x !== k) : [...h, k])} />}
        </div>
      }
      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50/70">
              {expandable && <th className="w-8 px-2 py-2.5" />}
              {selectable &&
              <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" className={checkboxCls} checked={allSelected} onChange={toggleAll} aria-label="Select all rows" />
                </th>
              }
              {shown.map((c) => {
                const active = sort?.key === c.key;
                const Icon = !active ? ArrowUpDownIcon : sort!.dir === 'asc' ? ArrowUpIcon : ArrowDownIcon;
                const options = c.filter === 'select' ? [...new Set(rows.map((r) => textOf(c, r)).filter(Boolean))].sort() : [];
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? sort!.dir === 'asc' ? 'ascending' : 'descending' : undefined}
                    className={twMerge('px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted', c.align === 'right' && 'text-right', c.className)}>
                    <span className="inline-flex items-center gap-1">
                      {c.sort ?
                      <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 uppercase hover:text-ink">
                          {c.header}
                          <Icon className={twMerge('h-3 w-3', active ? 'text-brand-600' : 'text-subtle')} />
                        </button> :
                      c.header}
                      {c.filter &&
                      <HeaderFilter
                        label={c.filterLabel ?? (c.title ?? (typeof c.header === 'string' ? c.header : c.key)).toLowerCase()}
                        type={c.filter}
                        options={options}
                        value={filters[c.key] ?? ''}
                        onApply={(v) => {setFilters((f) => ({ ...f, [c.key]: v }));setPage(1);}} />
                      }
                    </span>
                  </th>);

              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.length === 0 &&
            <tr><td colSpan={colCount} className="px-4 py-10 text-center text-[13px] text-muted">No records match the filters.</td></tr>
            }
            {visible.map((row) => {
              const k = rowKey(row);
              const open = expanded.includes(k);
              return (
                <React.Fragment key={k}>
                  <tr
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={twMerge('transition-colors duration-150', onRowClick && 'cursor-pointer hover:bg-slate-50', selectedKeys.includes(k) && 'bg-amber-50/50')}>
                    {expandable &&
                    <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                        type="button"
                        aria-label={open ? 'Collapse row' : 'Expand row'}
                        aria-expanded={open}
                        onClick={() => setExpanded((x) => open ? x.filter((i) => i !== k) : [...x, k])}
                        className="rounded p-1 text-subtle hover:bg-slate-100 hover:text-ink">
                          {open ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                        </button>
                      </td>
                    }
                    {selectable &&
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className={checkboxCls} checked={selectedKeys.includes(k)} onChange={() => toggleRow(k)} aria-label="Select row" />
                      </td>
                    }
                    {shown.map((c) =>
                    <td key={c.key} className={twMerge('px-4 py-3 align-middle text-[13px] text-ink', c.align === 'right' && 'text-right', c.className)}>
                        {c.render(row)}
                      </td>
                    )}
                  </tr>
                  {expandable && open &&
                  <tr className="bg-slate-50/60">
                      <td colSpan={colCount} className="px-6 py-4">{expandable.render(row)}</td>
                    </tr>
                  }
                </React.Fragment>);

            })}
          </tbody>
        </table>
      </div>
      {sorted.length > pageSize && <Pagination className="mt-3" page={page} pageSize={pageSize} total={sorted.length} onChange={setPage} />}
    </div>);

}
