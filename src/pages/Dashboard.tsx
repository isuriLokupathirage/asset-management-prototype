import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BoxIcon, CheckCircle2Icon, ClockIcon, CpuIcon, KeyRoundIcon, LaptopIcon, LayoutDashboardIcon, MouseIcon, TrendingUpIcon } from 'lucide-react';
import { kindLabel, kindPlural, type Kind } from '../types';
import { useStore } from '../store/AppStore';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/ui/DataTable';
import { assetsByStatus, expiringRows, newByMonth, totals, type ExpiringRow } from '../utils/selectors';
import { itemCounts } from '../services/domain';
import { formatDate } from '../utils/format';
import type { Item } from '../types';

const icons: Record<Kind, React.ComponentType<{className?: string;}>> = { asset: LaptopIcon, license: KeyRoundIcon, component: CpuIcon, accessory: MouseIcon };
const cardTone: Record<Kind, {bg: string;chip: string;icon: string;}> = {
  asset: { bg: 'bg-blue-100/80', chip: 'bg-blue-50', icon: 'bg-blue-50 text-blue-600' },
  license: { bg: 'bg-emerald-100/70', chip: 'bg-emerald-50', icon: 'bg-emerald-50 text-emerald-600' },
  component: { bg: 'bg-violet-100/70', chip: 'bg-violet-50', icon: 'bg-violet-50 text-violet-600' },
  accessory: { bg: 'bg-orange-100/70', chip: 'bg-orange-50', icon: 'bg-orange-50 text-orange-600' }
};
const typeBadge: Record<Kind, string> = {
  asset: 'bg-white text-sky-700 ring-sky-300',
  license: 'bg-white text-blue-700 ring-blue-300',
  component: 'bg-white text-violet-700 ring-violet-300',
  accessory: 'bg-white text-red-700 ring-red-300'
};
const bars: Record<Kind, string> = { asset: 'bg-sky-500', license: 'bg-violet-500', component: 'bg-emerald-500', accessory: 'bg-amber-500' };
const statusBar: Record<string, string> = { Deployable: 'bg-emerald-500', Pending: 'bg-amber-500', 'Under Maintenance': 'bg-violet-500', Undeployable: 'bg-red-500', Retired: 'bg-slate-400', Archived: 'bg-slate-300' };
const totalLabel: Record<Kind, string> = { asset: 'Total assets', license: 'Total licenses', component: 'Total components', accessory: 'Total accessories' };

const expiryStyle = {
  expired: { label: 'Expired', cls: 'bg-red-50 text-red-700 ring-red-200' },
  expiring_soon: { label: 'Expiring Soon', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  warning: { label: 'Warning', cls: 'bg-orange-50 text-orange-700 ring-orange-200' }
} as const;

export function Dashboard() {
  const { db } = useStore();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<'all' | 'asset' | 'license'>('all');
  const stats = useMemo(() => totals(db), [db]);
  const byStatus = useMemo(() => assetsByStatus(db), [db]);
  const expiring = useMemo(() => expiringRows(db, 60), [db]);
  const monthly = useMemo(() => newByMonth(db, 12), [db]);
  const maxMonth = Math.max(1, ...monthly.map((m) => m.asset + m.license + m.component + m.accessory));
  const totalAssets = byStatus.reduce((a, b) => a + b.count, 0) || 1;
  const available = useMemo(() => db.items.map((i) => ({ i, qty: itemCounts(db, i).available })).filter((x) => x.qty > 0).sort((a, b) => a.qty - b.qty), [db]);
  const shownExpiring = expiring.filter((r) => typeFilter === 'all' || r.kind === typeFilter);
  const count = (s: ExpiringRow['status']) => expiring.filter((r) => r.status === s).length;

  const availableCols: Column<{i: Item;qty: number;}>[] = [
  { key: 'name', header: 'Name', sort: (x) => x.i.name, render: (x) => <Link to={`/${kindPlural[x.i.kind].toLowerCase()}/${x.i.id}`} className="font-medium hover:text-brand-600">{x.i.name}</Link> },
  { key: 'company', header: 'Company', render: (x) => db.companies.find((c) => c.id === x.i.companyId)?.name },
  { key: 'man', header: 'Manufacturer', render: (x) => db.manufacturers.find((m) => m.id === (x.i.manufacturerId ?? db.models.find((md) => md.id === x.i.modelId)?.manufacturerId))?.name ?? '-' },
  { key: 'type', header: 'Type', render: (x) => <Badge className={`rounded-full px-2.5 py-0.5 text-[12px] ${typeBadge[x.i.kind]}`}>{kindLabel[x.i.kind]}</Badge> },
  { key: 'qty', header: 'Available Qty', align: 'right', sort: (x) => x.qty, render: (x) => <span className="font-semibold">{x.qty}</span> }];


  const expiringCols: Column<ExpiringRow>[] = [
  { key: 'name', header: 'Name', render: (r) => <Link to={`/${kindPlural[r.kind].toLowerCase()}/${r.itemId}`} className="font-medium hover:text-brand-600">{r.name}</Link> },
  { key: 'company', header: 'Company', render: (r) => r.company },
  { key: 'type', header: 'Type', render: (r) => <Badge className={`rounded-full px-2.5 py-0.5 text-[12px] ${typeBadge[r.kind]}`}>{kindLabel[r.kind]}</Badge> },
  { key: 'date', header: 'Expiration Date', sort: (r) => r.date, render: (r) => <span className="whitespace-nowrap">{formatDate(r.date)}</span> },
  { key: 'days', header: 'Days Until Expiry', sort: (r) => r.days, render: (r) => r.days < 0 ? `${Math.abs(r.days)} days ago` : `${r.days} days` },
  { key: 'status', header: 'Status', render: (r) => <Badge className={`px-2.5 py-0.5 text-[12px] ${expiryStyle[r.status].cls}`}>{expiryStyle[r.status].label}</Badge> },
  { key: 'details', header: 'Details', render: (r) => <span className="text-muted">{r.detail}</span> }];


  const counts: {n: number;cls: string;title: string;}[] = [
  { n: count('expired'), cls: 'bg-red-50 text-red-700 ring-red-300', title: 'Expired' },
  { n: count('expiring_soon'), cls: 'bg-amber-50 text-amber-700 ring-amber-300', title: 'Expiring soon (7 days)' },
  { n: count('warning'), cls: 'bg-orange-50 text-orange-700 ring-orange-300', title: 'Warning (60 days)' },
  { n: expiring.length, cls: 'bg-blue-50 text-blue-700 ring-blue-300', title: 'Total' }];


  const card = 'rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6';

  return (
    <>
      <PageHeader title="Asset Management Dashboard" icon={LayoutDashboardIcon} subtitle="Overview of your assets, licenses, components, and accessories" />
      <PageBody>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => {
            const Icon = icons[s.kind];
            const t = cardTone[s.kind];
            return (
              <button
                key={s.kind}
                type="button"
                onClick={() => navigate(`/${kindPlural[s.kind].toLowerCase()}`)}
                className={`flex min-h-[124px] flex-col justify-between rounded-2xl p-4 text-left shadow-card transition-shadow hover:shadow-pop ${t.bg}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-slate-700">{kindPlural[s.kind]}</p>
                    <p className="mt-1 text-3xl font-bold text-ink">{s.total}</p>
                  </div>
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${t.icon}`}><Icon className="h-5 w-5" /></span>
                </div>
                <span className={`mt-3 inline-block self-start rounded-md px-2 py-0.5 text-[11px] text-slate-600 ${t.chip}`}>{totalLabel[s.kind]}</span>
              </button>);

          })}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]">
          <section className={card}>
            <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-ink"><BoxIcon className="h-5 w-5 text-emerald-600" />Available Items</h2>
            <DataTable columns={availableCols} rows={available} rowKey={(x) => x.i.id} pageSize={6} emptyTitle="Nothing is available" emptyDescription="Items that can be assigned appear here." />
          </section>
          <section className={card}>
            <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-ink"><CheckCircle2Icon className="h-5 w-5 text-slate-500" />Assets by Status</h2>
            {byStatus.length === 0 ? <p className="py-10 text-center text-[13px] text-muted">No asset data available</p> :
            <>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Assets by status">
                  {byStatus.map((s) => <div key={s.name} className={statusBar[s.type]} style={{ width: `${s.count / totalAssets * 100}%` }} title={`${s.name}: ${s.count}`} />)}
                </div>
                <ul className="mt-4 space-y-2">
                  {byStatus.map((s) =>
                <li key={s.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[13px]">
                      <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${statusBar[s.type]}`} />{s.name}</span>
                      <span className="font-semibold text-ink">{s.count}</span>
                    </li>
                )}
                </ul>
              </>
            }
          </section>
        </div>

        <section className={`${card} mt-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-ink"><ClockIcon className="h-5 w-5 text-red-500" />Expiring Items</h2>
            <div className="flex gap-2">
              {counts.map((c) => <span key={c.title} title={c.title} className={`inline-flex min-w-[32px] justify-center rounded-lg px-2 py-1 text-[12px] font-semibold ring-1 ring-inset ${c.cls}`}>{c.n}</span>)}
            </div>
          </div>
          <div className="mb-4 mt-4 flex items-center gap-3">
            <span className="text-[13px] font-semibold text-ink">Filter by type:</span>
            {([['all', 'All'], ['asset', 'Assets'], ['license', 'Licenses']] as const).map(([v, l]) =>
            <button
              key={v}
              type="button"
              onClick={() => setTypeFilter(v)}
              aria-pressed={typeFilter === v}
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium ring-1 ring-inset transition-colors ${typeFilter === v ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-line hover:bg-slate-50'}`}>
                {l}
              </button>
            )}
          </div>
          <DataTable columns={expiringCols} rows={shownExpiring} rowKey={(r) => r.key} pageSize={6} emptyTitle="Nothing is expiring" emptyDescription="Assets nearing end of life and expiring licenses within 60 days appear here." />
        </section>

        <section className={`${card} mt-5`}>
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-ink"><TrendingUpIcon className="h-5 w-5 text-sky-600" />New Items by Month</h2>
          <div className="flex h-48 items-end gap-1.5 sm:gap-2.5">
            {monthly.map((m) => {
              const total = m.asset + m.license + m.component + m.accessory;
              return (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="h-4 text-[11px] font-medium text-ink">{total || ''}</span>
                  <div className="flex w-full max-w-[36px] flex-col-reverse overflow-hidden rounded-t-md" style={{ height: total ? Math.max(4, Math.round(total / maxMonth * 130)) : 0 }}>
                    {(['asset', 'license', 'component', 'accessory'] as Kind[]).map((k) => m[k] > 0 && <div key={k} className={bars[k]} style={{ flexGrow: m[k] }} title={`${kindPlural[k]}: ${m[k]}`} />)}
                  </div>
                  <span className="text-[11px] text-muted">{m.label}</span>
                </div>);

            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
            {(Object.keys(bars) as Kind[]).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${bars[k]}`} />{kindPlural[k]}</span>)}
          </div>
        </section>
      </PageBody>
    </>);

}
