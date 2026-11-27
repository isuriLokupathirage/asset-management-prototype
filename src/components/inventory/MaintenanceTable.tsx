import { useEffect, useState } from 'react';
import type { Maintenance, MaintenanceStatus } from '../../types';
import { useStore } from '../../store/AppStore';
import { changeAssetStatus, deployableLabel, findItem, updateMaintenance } from '../../services/domain';
import { DataTable, type Column } from '../ui/DataTable';
import { Menu } from '../ui/Menu';
import { StatusBadge } from '../ui/Badge';
import { Dialog } from '../ui/Dialog';
import { FormDrawer, Labeled } from '../ui/FormDrawer';
import { Input, Select, Textarea } from '../ui/Field';
import { formatDate, formatMoney, toDateInput } from '../../utils/format';
import { Link } from 'react-router-dom';

export const maintenanceTone = { pending: 'amber', in_progress: 'violet', completed: 'green', cancelled: 'slate' } as const;
export const maintenanceLabel: Record<MaintenanceStatus, string> = { pending: 'Pending', in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled' };

function EditMaintenance({ record, onClose }: {record?: Maintenance;onClose: () => void;}) {
  const { db, run, busy } = useStore();
  const [f, setF] = useState({ status: 'pending' as MaintenanceStatus, expected: '', cost: '', issue: '', notes: '', agent: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (record) {
      setF({ status: record.status, expected: record.expectedCompletionDate ?? '', cost: record.cost !== undefined ? String(record.cost) : '', issue: record.issueDescription ?? '', notes: record.notes ?? '', agent: record.repairAgentId });
      setErr({});
    }
  }, [record]);
  if (!record) return null;
  const active = record.status === 'pending' || record.status === 'in_progress';
  const submit = async () => {
    const e: Record<string, string> = {};
    if (f.cost && Number(f.cost) < 0) e.cost = 'Cost cannot be negative';
    if (f.expected && f.expected < record.maintenanceDate) e.expected = 'Cannot be before the maintenance date';
    setErr(e);
    if (Object.keys(e).length) return;
    const r = await run((d) => updateMaintenance(d, record.id, {
      status: active ? f.status === 'pending' || f.status === 'in_progress' ? f.status : record.status : record.status,
      expectedCompletionDate: f.expected || undefined,
      cost: f.cost ? Number(f.cost) : undefined,
      issueDescription: f.issue || undefined,
      notes: f.notes || undefined,
      repairAgentId: f.agent
    }), 'Maintenance record updated');
    if (r.ok) onClose();
  };
  return (
    <FormDrawer open onClose={onClose} onSubmit={submit} busy={busy} title="Edit maintenance record" subtitle={findItem(db, record.itemId)?.units.find((u) => u.id === record.unitId)?.tag}>
      <div className="space-y-4">
        <Labeled label="Repair agent">
          <Select value={f.agent} onChange={(e) => setF({ ...f, agent: e.target.value })}>
            {db.suppliers.filter((s) => s.type.includes('repair agent')).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Labeled>
        {active &&
        <Labeled label="Status">
            <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as MaintenanceStatus })}>
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
            </Select>
          </Labeled>
        }
        <Labeled label="Expected completion" error={err.expected}>
          <Input type="date" value={toDateInput(f.expected)} onChange={(e) => setF({ ...f, expected: e.target.value })} />
        </Labeled>
        <Labeled label="Cost (LKR)" error={err.cost}>
          <Input type="number" min={0} value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} />
        </Labeled>
        <Labeled label="Issue description"><Textarea value={f.issue} onChange={(e) => setF({ ...f, issue: e.target.value })} /></Labeled>
        <Labeled label="Notes"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Labeled>
      </div>
    </FormDrawer>);

}

/** Maintenance records with edit / complete / cancel actions. Completing returns the asset to a Deployable status. */
export function MaintenanceTable({ records }: {records: Maintenance[];}) {
  const { db, run, busy } = useStore();
  const [editing, setEditing] = useState<Maintenance>();
  const [closing, setClosing] = useState<{record: Maintenance;mode: 'completed' | 'cancelled';}>();

  const close = async () => {
    if (!closing) return;
    const { record, mode } = closing;
    const label = deployableLabel(db);
    if (!label) return;
    const r = await run((d) => changeAssetStatus(d, { itemId: record.itemId, unitId: record.unitId, statusLabelId: label.id, maintenance: { repairAgentId: record.repairAgentId, maintenanceDate: record.maintenanceDate, status: mode } }),
    mode === 'completed' ? 'Maintenance completed. The asset is available again.' : 'Maintenance cancelled. The asset is available again.');
    if (r.ok) setClosing(undefined);
  };

  const cols: Column<Maintenance>[] = [
  {
    key: 'asset',
    header: 'Asset',
    sort: (m) => findItem(db, m.itemId)?.units.find((u) => u.id === m.unitId)?.tag ?? '',
    render: (m) => {
      const item = findItem(db, m.itemId);
      const unit = item?.units.find((u) => u.id === m.unitId);
      return (
        <div>
            <Link to={`/assets/${m.itemId}`} className="font-medium text-ink hover:text-brand-600" onClick={(e) => e.stopPropagation()}>{unit?.tag}</Link>
          </div>);

    }
  },
  { key: 'agent', header: 'Repair agent', sort: (m) => db.suppliers.find((s) => s.id === m.repairAgentId)?.name ?? '', render: (m) => db.suppliers.find((s) => s.id === m.repairAgentId)?.name ?? '-' },
  { key: 'issue', header: 'Issue', render: (m) => <span className="line-clamp-2 max-w-[260px] text-muted">{m.issueDescription || m.notes || '-'}</span> },
  { key: 'date', header: 'Sent', sort: (m) => m.maintenanceDate, render: (m) => formatDate(m.maintenanceDate) },
  { key: 'expected', header: 'Expected / done', sort: (m) => m.completedDate ?? m.expectedCompletionDate ?? '', render: (m) => formatDate(m.completedDate ?? m.expectedCompletionDate) || '-' },
  { key: 'cost', header: 'Cost', sort: (m) => m.cost ?? 0, render: (m) => formatMoney(m.cost) || '-' },
  { key: 'status', header: 'Status', sort: (m) => m.status, render: (m) => <StatusBadge tone={maintenanceTone[m.status]}>{maintenanceLabel[m.status]}</StatusBadge> },
  {
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    align: 'right',
    render: (m) => {
      const active = m.status === 'pending' || m.status === 'in_progress';
      return (
        <Menu items={[
        { label: 'Edit record', onSelect: () => setEditing(m) },
        { label: 'Mark as completed', disabled: !active, hint: 'Already closed', onSelect: () => setClosing({ record: m, mode: 'completed' }) },
        { label: 'Cancel maintenance', danger: true, disabled: !active, hint: 'Already closed', onSelect: () => setClosing({ record: m, mode: 'cancelled' }) }]
        } />);

    }
  }];


  return (
    <>
      <DataTable columns={cols} rows={records} rowKey={(m) => m.id} pageSize={8} initialSort={{ key: 'date', dir: 'desc' }} emptyTitle="No maintenance records" emptyDescription="Change an asset's status to Under Maintenance to send it to a repair agent." />
      {editing && <EditMaintenance record={editing} onClose={() => setEditing(undefined)} />}
      <Dialog
        open={Boolean(closing)}
        busy={busy}
        title={closing?.mode === 'completed' ? 'Complete maintenance?' : 'Cancel maintenance?'}
        body="The asset's status will return to Ready to Deploy so it can be assigned again."
        confirmLabel={closing?.mode === 'completed' ? 'Complete' : 'Cancel maintenance'}
        cancelLabel="Back"
        confirmVariant={closing?.mode === 'completed' ? 'primary' : 'danger'}
        onCancel={() => setClosing(undefined)}
        onConfirm={close} />
    </>);

}
