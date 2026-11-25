import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangleIcon, CpuIcon, KeyRoundIcon, LaptopIcon, MouseIcon, WrenchIcon } from 'lucide-react';
import { kindLabel, kindPlural, type Kind } from '../types';
import { useStore } from '../store/AppStore';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Tabs';
import { Select } from '../components/ui/Field';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { assetsByStatus, expiringRows, newByMonth, totals } from '../utils/selectors';
import { employeeName, itemCounts } from '../services/domain';
import { formatDate, formatDateTime } from '../utils/format';

const icons: Record<Kind, React.ComponentType<{className?: string;}>> = { asset: LaptopIcon, license: KeyRoundIcon, component: CpuIcon, accessory: MouseIcon };
const tints: Record<Kind, string> = { asset: 'bg-sky-50 text-sky-700', license: 'bg-violet-50 text-violet-700', component: 'bg-emerald-50 text-emerald-700', accessory: 'bg-amber-50 text-amber-700' };
const bars: Record<Kind, string> = { asset: 'bg-sky-500', license: 'bg-violet-500', component: 'bg-emerald-500', accessory: 'bg-amber-500' };
const statusBar: Record<string, string> = { Deployable: 'bg-emerald-500', Pending: 'bg-amber-500', 'Under Maintenance': 'bg-violet-500', Undeployable: 'bg-red-500', Retired: 'bg-slate-400', Archived: 'bg-slate-300' };

export function Dashboard() {
  const { db } = useStore();
  const navigate = useNavigate();
  const [window, setWindow] = useState('30');
  const stats = useMemo(() => totals(db), [db]);
  const byStatus = useMemo(() => assetsByStatus(db), [db]);
  const expiring = useMemo(() => expiringRows(db, Number(window)), [db, window]);
  const monthly = useMemo(() => newByMonth(db, 12), [db]);
  const maxMonth = Math.max(1, ...monthly.map((m) => m.asset + m.license + m.component + m.accessory));
  const totalAssets = byStatus.reduce((a, b) => a + b.count, 0) || 1;
  const lowStock = db.items.filter((i) => itemCounts(db, i).available < i.minQty);
  const activeMaint = db.maintenance.filter((m) => m.status === 'pending' || m.status === 'in_progress');
  const recent = db.history.slice(0, 8);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Overview of everything tracked in Asset Management: availability, expiries, maintenance and recent activity." />
      <PageBody>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => {
            const Icon = icons[s.kind];
            return (
              <button
                key={s.kind}
                type="button"
                onClick={() => navigate(`/${kindPlural[s.kind].toLowerCase()}`)}
                className="rounded-xl border border-line bg-white p-4 text-left shadow-card transition-colors hover:border-brand-200">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${tints[s.kind]}`}><Icon className="h-4 w-4" /></span>
                  <span className="text-[12px] text-muted">{s.records} {s.records === 1 ? 'record' : 'records'}</span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-ink">{s.total}</p>
                <p className="text-[13px] text-muted">{s.kind === 'license' ? 'License seats' : `${kindPlural[s.kind]} in total`}</p>
                <div className="mt-3 flex gap-4 border-t border-line pt-3 text-[12px]">
                  <span><span className="font-semibold text-emerald-700">{s.available}</span> <span className="text-muted">available</span></span>
                  <span><span className="font-semibold text-sky-700">{s.assigned}</span> <span className="text-muted">assigned</span></span>
                </div>
              </button>);

          })}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card title="Assets by status">
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Assets by status">
              {byStatus.map((s) => <div key={s.name} className={statusBar[s.type]} style={{ width: `${s.count / totalAssets * 100}%` }} title={`${s.name}: ${s.count}`} />)}
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {byStatus.map((s) =>
              <li key={s.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[13px]">
                  <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${statusBar[s.type]}`} />{s.name}</span>
                  <span className="font-semibold text-ink">{s.count}</span>
                </li>
              )}
            </ul>
          </Card>

          <Card title="New items by month" action={<span className="text-[12px] text-muted">Last 12 months</span>}>
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
          </Card>

          <Card
            title="Expiring items"
            action={
            <Select aria-label="Expiry window" className="h-8 w-36 text-[13px]" value={window} onChange={(e) => setWindow(e.target.value)}>
                <option value="7">Next 7 days</option>
                <option value="30">Next 30 days</option>
                <option value="90">Next 90 days</option>
              </Select>
            }>
            {expiring.length === 0 ? <p className="py-6 text-center text-[13px] text-muted">Nothing expires in this window.</p> :
            <ul className="divide-y divide-line">
                {expiring.slice(0, 7).map((r) =>
              <li key={r.key} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link to={`/${kindPlural[r.kind].toLowerCase()}/${r.itemId}`} className="block truncate text-[13px] font-medium text-ink hover:text-brand-600">{r.name}</Link>
                      <p className="text-[11px] text-muted">{r.tag} · {r.type} · {formatDate(r.date)}</p>
                    </div>
                    <StatusBadge tone={r.status === 'expired' ? 'red' : r.status === 'expiring_soon' ? 'amber' : 'slate'}>
                      {r.days < 0 ? `Expired ${Math.abs(r.days)}d ago` : `In ${r.days}d`}
                    </StatusBadge>
                  </li>
              )}
              </ul>
            }
          </Card>

          <Card title="Needs attention">
            <div className="space-y-4">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted"><AlertTriangleIcon className="h-3.5 w-3.5" />Low stock ({lowStock.length})</p>
                {lowStock.length === 0 ? <p className="text-[13px] text-muted">All items are above their minimum quantity.</p> :
                <ul className="space-y-1.5">
                    {lowStock.slice(0, 5).map((i) =>
                  <li key={i.id} className="flex items-center justify-between text-[13px]">
                        <Link to={`/${kindPlural[i.kind].toLowerCase()}/${i.id}`} className="truncate text-ink hover:text-brand-600">{i.name}</Link>
                        <Badge className="bg-amber-50 text-amber-800 ring-amber-200">{itemCounts(db, i).available} left · min {i.minQty}</Badge>
                      </li>
                  )}
                  </ul>
                }
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted"><WrenchIcon className="h-3.5 w-3.5" />Under maintenance ({activeMaint.length})</p>
                {activeMaint.length === 0 ? <p className="text-[13px] text-muted">No assets are with a repair agent.</p> :
                <ul className="space-y-1.5">
                    {activeMaint.map((m) =>
                  <li key={m.id} className="flex items-center justify-between text-[13px]">
                        <Link to="/maintenance" className="text-ink hover:text-brand-600">{db.items.find((i) => i.id === m.itemId)?.units.find((u) => u.id === m.unitId)?.tag}</Link>
                        <span className="text-muted">{db.suppliers.find((s) => s.id === m.repairAgentId)?.name}</span>
                      </li>
                  )}
                  </ul>
                }
              </div>
            </div>
          </Card>

          <Card title="Recent activity" className="lg:col-span-2">
            <ul className="divide-y divide-line">
              {recent.map((h) =>
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[13px]">
                  <span>
                    <Badge className="mr-2">{kindLabel[h.kind]}</Badge>
                    <span className="font-medium text-ink">{h.action}</span>
                    {h.detail && <span className="text-muted"> · {h.detail}</span>}
                  </span>
                  <span className="text-[11px] text-subtle">{formatDateTime(h.at)} · {employeeName(db, h.by)}</span>
                </li>
              )}
            </ul>
          </Card>
        </div>
      </PageBody>
    </>);

}
