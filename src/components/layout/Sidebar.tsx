import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDownIcon, CircleUserRoundIcon, PackageIcon, RotateCcwIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { SearchInput } from '../ui/SearchInput';
import { Dialog } from '../ui/Dialog';
import { useStore } from '../../store/AppStore';
import { Avatar } from '../ui/Tabs';
import { employeeName } from '../../services/domain';
import { CURRENT_USER_ID } from '../../types';

interface NavLeaf {label: string;to: string;}
interface NavGroup {heading?: string;items: NavLeaf[];}

export const navGroups: NavGroup[] = [
{ items: [{ label: 'Dashboard', to: '/dashboard' }] },
{
  heading: 'Inventory',
  items: [
  { label: 'Assets', to: '/assets' },
  { label: 'Licenses', to: '/licenses' },
  { label: 'Components', to: '/components' },
  { label: 'Accessories', to: '/accessories' }]
},
{
  heading: 'Assignments',
  items: [
  { label: 'User Assignments', to: '/assignments' },
  { label: 'Maintenance', to: '/maintenance' }]
},
{
  heading: 'Settings',
  items: [
  { label: 'Companies', to: '/settings/companies' },
  { label: 'Departments', to: '/settings/departments' },
  { label: 'Categories', to: '/settings/categories' },
  { label: 'Manufacturers', to: '/settings/manufacturers' },
  { label: 'Suppliers', to: '/settings/suppliers' },
  { label: 'Asset Models', to: '/settings/asset-models' },
  { label: 'Asset Types', to: '/settings/asset-types' },
  { label: 'Status Labels', to: '/settings/status-labels' },
  { label: 'Custom Fields', to: '/settings/custom-fields' },
  { label: 'Field Sets', to: '/settings/field-sets' }]
}];


export function Sidebar() {
  const location = useLocation();
  const { db, resetDemo } = useStore();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const groups = useMemo(() => {
    const n = query.trim().toLowerCase();
    if (!n) return navGroups;
    return navGroups.map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(n)) })).filter((g) => g.items.length);
  }, [query]);

  const moduleActive = !location.pathname.startsWith('/my-assignments');

  return (
    <aside className="flex h-full w-[268px] shrink-0 flex-col border-r border-line bg-white">
      <div className="px-5 pb-3 pt-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-ink">A</span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink">Accxis 360</p>
            <p className="text-[11px] text-muted">Workforce Management</p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle">Modules</p>
        <SearchInput value={query} onChange={setQuery} placeholder="Search menu" />
      </div>

      <nav className="scroll-thin flex-1 overflow-y-auto px-3 pb-4" aria-label="Asset Management">
        <div className="mb-1">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            className={twMerge(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors duration-150',
              moduleActive ? 'text-ink' : 'text-muted hover:bg-slate-50 hover:text-ink'
            )}>
            <PackageIcon className={twMerge('h-4 w-4 shrink-0', moduleActive ? 'text-brand-500' : 'text-subtle')} />
            <span className="flex-1 truncate">Asset Management</span>
            <ChevronDownIcon className={twMerge('h-3.5 w-3.5 shrink-0 text-subtle transition-transform duration-150', collapsed && '-rotate-90')} />
          </button>
          {!collapsed &&
          <div className="mb-2 ml-4 border-l border-line pl-3">
              {groups.length === 0 && <p className="px-2.5 py-2 text-[13px] text-muted">No matching pages</p>}
              {groups.map((group, idx) =>
            <div key={group.heading ?? idx} className="mt-1">
                  {group.heading &&
              <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">{group.heading}</p>
              }
                  {group.items.map((item) =>
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                twMerge(
                  'relative mb-0.5 block rounded-lg px-2.5 py-1.5 text-[13px] transition-colors duration-150',
                  isActive ? 'bg-amber-50 font-medium text-amber-900' : 'text-muted hover:bg-slate-50 hover:text-ink'
                )
                }>
                      {item.label}
                    </NavLink>
              )}
                </div>
            )}
            </div>
          }
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <NavLink
            to="/my-assignments"
            className={({ isActive }) =>
            twMerge(
              'mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-150',
              isActive ? 'bg-amber-50 font-medium text-amber-900' : 'text-muted hover:bg-slate-50 hover:text-ink'
            )
            }>
            <CircleUserRoundIcon className="h-4 w-4 text-subtle" />
            <span className="flex-1">My Assignments</span>
          </NavLink>
        </div>
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-2.5 py-2">
          <Avatar name={employeeName(db, CURRENT_USER_ID)} size="sm" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[12px] font-medium text-ink">{employeeName(db, CURRENT_USER_ID)}</p>
            <p className="text-[11px] text-muted">Demo user · all access</p>
          </div>
          <button
            type="button"
            title="Reset demo data"
            aria-label="Reset demo data"
            onClick={() => setConfirmReset(true)}
            className="rounded-md p-1.5 text-subtle transition-colors hover:bg-white hover:text-ink">
            <RotateCcwIcon className="h-4 w-4" />
          </button>
        </div>
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
