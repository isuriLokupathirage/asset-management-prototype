import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface Option {value: string;label: string;hint?: string;disabled?: boolean;}

/** A dropdown with type-to-filter, used wherever the list of choices can be long (employees, models, assets). */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select',
  disabled,
  clearable,
  invalid,
  id
}: {value: string;onChange: (v: string) => void;options: Option[];placeholder?: string;disabled?: boolean;clearable?: boolean;invalid?: boolean;id?: string;}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(n)) : options;
  }, [q, options]);

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {setOpen((o) => !o);setQ('');}}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={twMerge(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-sm transition-colors duration-150 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-subtle',
          invalid ? 'border-red-300' : 'border-line'
        )}>
        <span className={twMerge('truncate', selected ? 'text-ink' : 'text-subtle')}>{selected ? selected.label : placeholder}</span>
        <span className="flex items-center gap-1">
          {clearable && selected && !disabled &&
          <span
            role="button"
            aria-label="Clear selection"
            onClick={(e) => {e.stopPropagation();onChange('');}}
            className="rounded p-0.5 text-subtle hover:bg-slate-100 hover:text-ink">
              <XIcon className="h-3.5 w-3.5" />
            </span>
          }
          <ChevronDownIcon className="h-4 w-4 text-subtle" />
        </span>
      </button>
      {open &&
      <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-lg border border-line bg-white shadow-pop">
          <div className="relative border-b border-line">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            aria-label="Search options"
            className="h-9 w-full bg-transparent pl-9 pr-3 text-sm focus:outline-none" />
          </div>
          <ul role="listbox" className="scroll-thin max-h-56 overflow-y-auto py-1">
            {shown.length === 0 && <li className="px-3 py-2 text-[13px] text-muted">No matches</li>}
            {shown.map((o) =>
          <li key={o.value}>
                <button
              type="button"
              role="option"
              aria-selected={o.value === value}
              disabled={o.disabled}
              onClick={() => {onChange(o.value);setOpen(false);}}
              className={twMerge(
                'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px]',
                o.disabled ? 'cursor-not-allowed text-slate-400' : 'text-ink hover:bg-slate-50'
              )}>
                  <span className="min-w-0">
                    <span className="block truncate">{o.label}</span>
                    {o.hint && <span className="block truncate text-[11px] text-muted">{o.hint}</span>}
                  </span>
                  {o.value === value && <CheckIcon className="h-4 w-4 shrink-0 text-brand-500" />}
                </button>
              </li>
          )}
          </ul>
        </div>
      }
    </div>);

}
