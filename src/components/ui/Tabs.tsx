import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface TabDef {id: string;label: string;count?: number;}

export function Tabs({ tabs, active, onChange }: {tabs: TabDef[];active: string;onChange: (id: string) => void;}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
      {tabs.map((t) =>
      <button
        key={t.id}
        role="tab"
        type="button"
        aria-selected={t.id === active}
        onClick={() => onChange(t.id)}
        className={twMerge(
          '-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition-colors duration-150',
          t.id === active ? 'border-brand-500 text-ink' : 'border-transparent text-muted hover:text-ink'
        )}>
          {t.label}
          {t.count !== undefined &&
        <span className="rounded-full bg-slate-100 px-1.5 text-[11px] text-muted">{t.count}</span>
        }
        </button>
      )}
    </div>);

}

/** Label and value pair used in details panels. */
export function Detail({ label, children }: {label: string;children?: React.ReactNode;}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-subtle">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{children === undefined || children === null || children === '' ? <span className="text-subtle">-</span> : children}</dd>
    </div>);

}

export function Card({ title, action, children, className }: {title?: string;action?: React.ReactNode;children: React.ReactNode;className?: string;}) {
  return (
    <section className={twMerge('rounded-xl border border-line bg-white shadow-card', className)}>
      {title &&
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {action}
        </div>
      }
      <div className="p-5">{children}</div>
    </section>);

}

export function Avatar({ name, size = 'md' }: {name: string;size?: 'sm' | 'md' | 'lg';}) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const palette = ['bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-700', 'bg-teal-100 text-teal-700'];
  const tone = palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];
  const dims = size === 'lg' ? 'h-12 w-12 text-base' : size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${dims} ${tone}`}>{initials}</span>;
}
