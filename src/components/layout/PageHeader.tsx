import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
import { useSidebarControl } from './AppShell';

export function PageHeader({
  title,
  subtitle,
  actions,
  backTo,
  backLabel,
  meta,
  leading
}: {title: string;subtitle?: string;actions?: React.ReactNode;backTo?: string;backLabel?: string;meta?: React.ReactNode;leading?: React.ReactNode;}) {
  const sidebar = useSidebarControl();
  const ToggleIcon = sidebar?.open ? PanelLeftCloseIcon : PanelLeftOpenIcon;
  return (
    <header className="border-b border-line bg-white px-4 py-4 sm:px-8 sm:py-5">
      <div className="mb-2 flex items-center gap-3">
        {sidebar &&
        <>
            <button
            type="button"
            onClick={sidebar.toggle}
            aria-label={sidebar.open ? 'Hide sidebar' : 'Show sidebar'}
            className="rounded-md p-1.5 text-ink transition-colors duration-150 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-200">
              <ToggleIcon className="h-4 w-4" />
            </button>
            <span className="h-5 w-px bg-line" aria-hidden="true" />
          </>
        }
        {backTo ?
        <Link to={backTo} className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors duration-150 hover:text-ink">
            <ChevronLeftIcon className="h-4 w-4" />
            {backLabel ?? 'Back'}
          </Link> :
        <span className="text-[12px] font-medium text-subtle">Asset Management</span>}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          {leading}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-1 max-w-2xl text-[13px] text-muted">{subtitle}</p>}
            {meta}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>);

}

export function PageBody({ children }: {children: React.ReactNode;}) {
  return <div className="px-4 py-6 sm:px-8">{children}</div>;
}
