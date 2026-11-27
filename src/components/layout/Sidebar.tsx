import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Building2Icon,
  CpuIcon,
  KeyRoundIcon,
  LaptopIcon,
  LayersIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  ListIcon,
  MouseIcon,
  FactoryIcon,
  RotateCcwIcon,
  TableIcon,
  TagIcon,
  TruckIcon,
  UserCheckIcon,
  UsersIcon,
  BuildingIcon,
  TagsIcon } from
'lucide-react';
import { twMerge } from 'tailwind-merge';
import { Dialog } from '../ui/Dialog';
import { useStore } from '../../store/AppStore';
import { employeeName } from '../../services/domain';
import { CURRENT_USER_ID } from '../../types';

type Icon = React.ComponentType<{className?: string;}>;
interface NavLeaf {label: string;to: string;icon: Icon;}

/** Flyout menu of the Asset Management module, grouped as on the current application. */
export const navGroups: NavLeaf[][] = [
[
{ label: 'Asset Dashboard', to: '/dashboard', icon: LayoutDashboardIcon },
{ label: 'People', to: '/assignments', icon: UsersIcon },
{ label: 'My Assignments', to: '/my-assignments', icon: UserCheckIcon }],

[
{ label: 'Assets', to: '/assets', icon: LaptopIcon },
{ label: 'Licenses', to: '/licenses', icon: KeyRoundIcon },
{ label: 'Components', to: '/components', icon: CpuIcon },
{ label: 'Accessories', to: '/accessories', icon: MouseIcon }],

[
{ label: 'Custom Fields', to: '/settings/custom-fields', icon: ListIcon },
{ label: 'Field Sets', to: '/settings/field-sets', icon: LayersIcon },
{ label: 'Models', to: '/settings/asset-models', icon: TableIcon },
{ label: 'Asset Types', to: '/settings/asset-types', icon: TagsIcon },
{ label: 'Categories', to: '/settings/categories', icon: LayoutGridIcon },
{ label: 'Companies', to: '/settings/companies', icon: Building2Icon },
{ label: 'Departments', to: '/settings/departments', icon: BuildingIcon },
{ label: 'Manufacturers', to: '/settings/manufacturers', icon: FactoryIcon },
{ label: 'Status Labels', to: '/settings/status-labels', icon: TagIcon },
{ label: 'Suppliers', to: '/settings/suppliers', icon: TruckIcon }]];



export function Sidebar() {
  const location = useLocation();
  const { db, resetDemo } = useStore();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const name = employeeName(db, CURRENT_USER_ID);
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <aside className="relative z-40 flex h-full w-[72px] shrink-0 flex-col items-center bg-[#F7F3EC] py-5" aria-label="Main navigation">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-400 text-sm font-bold text-ink" title="Accxis 360">A</span>
      <div className="my-5 h-px w-8 bg-slate-300/70" />

      <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
        <button
          type="button"
          aria-label="Asset Management"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className={twMerge(
            'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
            open ? 'bg-amber-100 text-ink' : 'bg-brand-400/80 text-ink hover:bg-brand-400'
          )}>
          <LaptopIcon className="h-5 w-5" />
        </button>

        {open &&
        <>
            <span className="absolute bottom-full left-0 z-50 mb-2 whitespace-nowrap rounded-lg bg-brand-300 px-3 py-1.5 text-[13px] font-medium text-ink shadow-card" role="tooltip">Asset Management</span>
            <div className="absolute left-full top-0 z-50 pl-3">
              <nav role="menu" className="scroll-thin max-h-[calc(100vh-130px)] w-[250px] overflow-y-auto rounded-xl border border-line bg-white py-1.5 shadow-pop">
                {navGroups.map((group, gi) =>
              <div key={gi} className={gi > 0 ? 'mt-1 border-t border-line pt-1' : ''}>
                    {group.map((item) =>
                <NavLink
                  key={item.to}
                  to={item.to}
                  role="menuitem"
                  className={({ isActive }) =>
                  twMerge(
                    'flex items-center gap-3 px-4 py-2 text-[14px] leading-5 transition-colors',
                    isActive ? 'bg-amber-50 font-medium text-ink' : 'text-slate-700 hover:bg-slate-50'
                  )
                  }>
                        <item.icon className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                )}
                  </div>
              )}
              </nav>
            </div>
          </>
        }
      </div>

      <div className="mt-auto flex flex-col items-center gap-3">
        <button
          type="button"
          title="Reset demo data"
          aria-label="Reset demo data"
          onClick={() => setConfirmReset(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-white hover:text-ink">
          <RotateCcwIcon className="h-5 w-5" />
        </button>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white" title={`${name} · demo user, all access`}>{initials}</span>
      </div>

      <Dialog
        open={confirmReset}
        title="Reset demo data?"
        body="All changes made in this prototype will be discarded and the original demo dataset restored."
        confirmLabel="Reset"
        confirmVariant="danger"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {resetDemo();setConfirmReset(false);}} />
    </aside>);

}
