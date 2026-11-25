import { useMemo, useState } from 'react';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { useStore } from '../store/AppStore';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Field';
import { MaintenanceTable, maintenanceLabel } from '../components/inventory/MaintenanceTable';
import type { MaintenanceStatus } from '../types';
import { formatMoney } from '../utils/format';

export function MaintenancePage() {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [agent, setAgent] = useState('');

  const rows = useMemo(() => db.maintenance.filter((m) => {
    if (status && m.status !== status) return false;
    if (agent && m.repairAgentId !== agent) return false;
    const n = q.trim().toLowerCase();
    if (!n) return true;
    const item = db.items.find((i) => i.id === m.itemId);
    const unit = item?.units.find((u) => u.id === m.unitId);
    return `${item?.name} ${unit?.tag} ${m.issueDescription} ${m.notes}`.toLowerCase().includes(n);
  }), [db, q, status, agent]);

  const open = db.maintenance.filter((m) => m.status === 'pending' || m.status === 'in_progress');
  const spend = db.maintenance.filter((m) => m.status !== 'cancelled').reduce((a, m) => a + (m.cost ?? 0), 0);

  return (
    <>
      <PageHeader title="Maintenance" subtitle="Repairs and servicing of assets. Send an asset for maintenance by changing its status on the asset page." />
      <PageBody>
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[['Open', open.length], ['Completed', db.maintenance.filter((m) => m.status === 'completed').length], ['Cancelled', db.maintenance.filter((m) => m.status === 'cancelled').length], ['Total cost', formatMoney(spend)]].map(([l, v]) =>
          <div key={l} className="rounded-xl border border-line bg-white px-4 py-3 shadow-card">
              <p className="text-[12px] text-muted">{l}</p>
              <p className="mt-1 text-xl font-semibold text-ink">{v}</p>
            </div>
          )}
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SearchInput className="w-full sm:w-72" value={q} onChange={setQ} placeholder="Search by asset, tag or issue" />
          <Select className="w-full sm:w-44" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {(Object.keys(maintenanceLabel) as MaintenanceStatus[]).map((s) => <option key={s} value={s}>{maintenanceLabel[s]}</option>)}
          </Select>
          <Select className="w-full sm:w-56" aria-label="Filter by repair agent" value={agent} onChange={(e) => setAgent(e.target.value)}>
            <option value="">All repair agents</option>
            {db.suppliers.filter((s) => s.type.includes('repair agent')).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <MaintenanceTable records={rows} showAsset />
      </PageBody>
    </>);

}
