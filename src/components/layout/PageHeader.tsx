import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
import { useSidebarControl } from './AppShell';

export function PageHeader({
  title,
  subtitle,
  actions,
  backTo,
  backLabel,
  meta,
  leading,
  icon: Icon
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  backTo?: string;
  backLabel?: string;
  meta?: React.ReactNode;
  leading?: React.ReactNode;
  /** Small icon shown before the title, as on the current Asset Management pages. */
  icon?: React.ComponentType<{className?: string;}>;
}) {
  const sidebar = useSidebarControl();
  const ToggleIcon = sidebar?.open ? PanelLeftCloseIcon : PanelLeftOpenIcon;
  return (
    <header className="px-4 pb-2 pt-4 sm:px-8 sm:pt-6">
      <div className="mb-3 flex items-center gap-3">
        {sidebar &&
        <button
          type="button"
          onClick={sidebar.toggle}
          aria-label={sidebar.open ? 'Hide sidebar' : 'Show sidebar'}
          className="rounded-md p-1.5 text-ink transition-colors duration-150 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-200">
            <ToggleIcon className="h-4 w-4" />
          </button>
        }
        {backTo &&
        <Link
          to={backTo}
          aria-label={backLabel ? `Back to ${backLabel}` : 'Back'}
          title={backLabel ? `Back to ${backLabel}` : 'Back'}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink shadow-card transition-colors hover:bg-slate-50">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        }
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          {leading}
          <div className="min-w-0">
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-ink">
              {Icon && <Icon className="h-6 w-6 text-brand-500" />}
              {title}
            </h1>
            {subtitle && <p className="mt-1 max-w-2xl text-[13px] text-muted">{subtitle}</p>}
            {meta}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>);

}

export function PageBody({ children }: {children: React.ReactNode;}) {
  return <div className="px-4 py-5 sm:px-8">{children}</div>;
}
