import { useEffect, useState } from 'react';
import type { Item, ReturnCondition, Unit } from '../../types';
import { kindLabel } from '../../types';
import { useStore } from '../../store/AppStore';
import {
  assignUnit,
  changeAssetStatus,
  deleteUnit,
  employeeName,
  returnAssignment,
  unitStatus,
  updateUnit,
  addUnits,
  findItem,
  generateTags,
  assigneeLabel } from
'../../services/domain';
import { FormDrawer, FormSection, Labeled } from '../ui/FormDrawer';
import { Dialog } from '../ui/Dialog';
import { Input, Select, Textarea, Checkbox } from '../ui/Field';
import { SearchableSelect } from '../ui/SearchableSelect';
import { Badge, StatusBadge } from '../ui/Badge';
import { Avatar } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { blankUnit, UnitFields, validateUnitForm } from './UnitFields';
import { formatDate, toDateInput } from '../../utils/format';

// ------------------------------------------------------------------ assign

export function AssignDrawer({
  open,
  onClose,
  item,
  unit,
  employeeId




}: {open: boolean;onClose: () => void;item: Item;unit?: Unit; /** Preselect the user when launched from a user's page. */employeeId?: string;}) {
  const { db, run, busy } = useStore();
  const [unitId, setUnitId] = useState('');
  const [target, setTarget] = useState<'user' | 'asset'>('user');
  const [userId, setUserId] = useState('');
  const [assetItemId, setAssetItemId] = useState('');
  const [assetUnitId, setAssetUnitId] = useState('');
  const [notes, setNotes] = useState('');
  const [activate, setActivate] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setUnitId(unit?.id ?? '');
    setTarget('user');
    setUserId(employeeId ?? '');
    setAssetItemId('');
    setAssetUnitId('');
    setNotes('');
    setActivate(false);
    setErr({});
  }, [open, unit?.id, employeeId]);

  const available = item.units.filter((u) => unitStatus(db, item, u).available);
  const hosts = db.items.filter((i) => i.kind === 'asset');
  const hostItem = findItem(db, assetItemId);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!unitId) e.unit = `Select the ${item.kind === 'license' ? 'seat' : 'individual item'} to assign`;
    if (target === 'user' && !userId) e.user = 'Select a user';
    if (target === 'asset' && !assetItemId) e.asset = 'Select an asset';
    if (target === 'asset' && assetItemId && !assetUnitId) e.assetUnit = 'Select the individual asset';
    setErr(e);
    if (Object.keys(e).length) return;
    const who = target === 'user' ? employeeName(db, userId) : hostItem?.units.find((u) => u.id === assetUnitId)?.tag;
    const r = await run((d) => assignUnit(d, {
      itemId: item.id,
      unitId,
      toEmployeeId: target === 'user' ? userId : undefined,
      toItemId: target === 'asset' ? assetItemId : undefined,
      toUnitId: target === 'asset' ? assetUnitId : undefined,
      notes,
      activate
    }), `${item.units.find((u) => u.id === unitId)?.tag ?? 'Item'} assigned to ${who}`);
    if (r.ok) onClose();
  };

  return (
    <FormDrawer open={open} onClose={onClose} onSubmit={submit} busy={busy} title={`Assign ${kindLabel[item.kind].toLowerCase()}`} subtitle={item.name} submitLabel="Confirm assignment">
      <div className="space-y-5">
        <Labeled label={item.kind === 'license' ? 'Seat' : 'Individual item'} required error={err.unit} hint={`${available.length} available`}>
          <SearchableSelect
            value={unitId}
            onChange={setUnitId}
            placeholder={available.length ? 'Select item' : 'Nothing available to assign'}
            disabled={available.length === 0 || Boolean(unit)}
            invalid={Boolean(err.unit)}
            options={available.map((u) => ({ value: u.id, label: u.tag, hint: u.serial ?? u.licenseKey }))} />
        </Labeled>

        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink">Assign to</p>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="tablist">
            {(['user', 'asset'] as const).map((t) =>
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={target === t}
              onClick={() => setTarget(t)}
              className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors ${target === t ? 'bg-white text-ink shadow-card' : 'text-muted hover:text-ink'}`}>
                {t === 'user' ? 'A user' : 'Another asset'}
              </button>
            )}
          </div>
        </div>

        {target === 'user' ?
        <Labeled label="User" required error={err.user}>
            <SearchableSelect
            value={userId}
            onChange={setUserId}
            placeholder="Search for a user"
            invalid={Boolean(err.user)}
            options={db.employees.map((e) => ({ value: e.id, label: e.name, hint: `${e.position} · ${db.departments.find((d) => d.id === e.departmentId)?.name ?? ''}` }))} />
          </Labeled> :

        <>
            <Labeled label="Asset" required error={err.asset}>
              <SearchableSelect
              value={assetItemId}
              onChange={(v) => {setAssetItemId(v);setAssetUnitId('');}}
              placeholder="Select asset"
              invalid={Boolean(err.asset)}
              options={hosts.map((h) => ({ value: h.id, label: h.name }))} />
            </Labeled>
            <Labeled label="Individual asset" required error={err.assetUnit}>
              <SearchableSelect
              value={assetUnitId}
              onChange={setAssetUnitId}
              placeholder={assetItemId ? 'Select individual asset' : 'Select an asset first'}
              disabled={!assetItemId}
              invalid={Boolean(err.assetUnit)}
              options={(hostItem?.units ?? []).filter((u) => !(hostItem?.id === item.id && u.id === unitId)).map((u) => ({ value: u.id, label: u.tag, hint: u.serial }))} />
            </Labeled>
          </>
        }

        {item.kind === 'license' &&
        <Checkbox label="Mark the seat as activated" description="Records that the software has been activated for this assignee" checked={activate} onChange={(e) => setActivate(e.target.checked)} />
        }
        <Labeled label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Handover remarks, accessories issued, etc." />
        </Labeled>
      </div>
    </FormDrawer>);

}

// ------------------------------------------------------------------ return

export function ReturnDrawer({ open, onClose, assignmentId }: {open: boolean;onClose: () => void;assignmentId?: string;}) {
  const { db, run, busy } = useStore();
  const [notes, setNotes] = useState('');
  const [condition, setCondition] = useState<ReturnCondition>('Good');
  const a = db.assignments.find((x) => x.id === assignmentId);
  const item = findItem(db, a?.itemId);
  const unit = item?.units.find((u) => u.id === a?.unitId);

  useEffect(() => {
    if (open) {setNotes('');setCondition('Good');}
  }, [open, assignmentId]);

  if (!a || !item || !unit) return null;
  const submit = async () => {
    const r = await run((d) => returnAssignment(d, { assignmentId: a.id, returnNotes: notes, condition }), `${unit.tag} returned`);
    if (r.ok) onClose();
  };
  return (
    <FormDrawer open={open} onClose={onClose} onSubmit={submit} busy={busy} title={`Return ${kindLabel[item.kind].toLowerCase()}`} subtitle={item.name} submitLabel="Confirm return">
      <div className="space-y-5">
        <div className="rounded-xl border border-line bg-slate-50/60 p-4 text-[13px]">
          <p className="font-semibold text-ink">{unit.tag}</p>
          <p className="mt-0.5 text-muted">Assigned to {assigneeLabel(db, a)} on {formatDate(a.assignedAt)}</p>
        </div>
        <Labeled label="Condition on return">
          <Select value={condition} onChange={(e) => setCondition(e.target.value as ReturnCondition)}>
            <option>Good</option>
            <option>Damaged</option>
            <option>Lost</option>
          </Select>
        </Labeled>
        <Labeled label="Return notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condition, missing accessories, etc." />
        </Labeled>
        {condition !== 'Good' &&
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            The item becomes available again. Use <strong>Change status</strong> afterwards to send it for maintenance or mark it undeployable.
          </p>
        }
      </div>
    </FormDrawer>);

}

// ------------------------------------------------------------------ asset status + maintenance

export function StatusDrawer({ open, onClose, item, unit }: {open: boolean;onClose: () => void;item: Item;unit?: Unit;}) {
  const { db, run, busy } = useStore();
  const [statusId, setStatusId] = useState('');
  const [agent, setAgent] = useState('');
  const [date, setDate] = useState('');
  const [expected, setExpected] = useState('');
  const [issue, setIssue] = useState('');
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');
  const [mStatus, setMStatus] = useState<'pending' | 'in_progress'>('pending');
  const [err, setErr] = useState<Record<string, string>>({});

  const active = db.maintenance.find((m) => m.unitId === unit?.id && (m.status === 'pending' || m.status === 'in_progress'));
  useEffect(() => {
    if (!open || !unit) return;
    setStatusId(unit.statusLabelId ?? '');
    setAgent(active?.repairAgentId ?? '');
    setDate(active?.maintenanceDate ?? new Date().toISOString().slice(0, 10));
    setExpected(active?.expectedCompletionDate ?? '');
    setIssue(active?.issueDescription ?? '');
    setNotes(active?.notes ?? '');
    setCost(active?.cost !== undefined ? String(active.cost) : '');
    setMStatus(active?.status === 'in_progress' ? 'in_progress' : 'pending');
    setErr({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit?.id]);

  if (!unit) return null;
  const chosen = db.statusLabels.find((s) => s.id === statusId);
  const toMaint = chosen?.statusType === 'Under Maintenance';
  const current = db.statusLabels.find((s) => s.id === unit.statusLabelId);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!statusId) e.status = 'Select a status';
    if (toMaint) {
      if (!agent) e.agent = 'Select a repair agent';
      if (!date) e.date = 'Maintenance date is required';
      if (expected && date && expected < date) e.expected = 'Cannot be before the maintenance date';
      if (cost && Number(cost) < 0) e.cost = 'Cost cannot be negative';
    }
    setErr(e);
    if (Object.keys(e).length) return;
    const r = await run((d) => changeAssetStatus(d, {
      itemId: item.id,
      unitId: unit.id,
      statusLabelId: statusId,
      maintenance: toMaint ? { repairAgentId: agent, maintenanceDate: date, expectedCompletionDate: expected || undefined, issueDescription: issue || undefined, notes: notes || undefined, cost: cost ? Number(cost) : undefined, status: mStatus } : undefined
    }), `${unit.tag} status updated`);
    if (r.ok) onClose();
  };

  return (
    <FormDrawer open={open} onClose={onClose} onSubmit={submit} busy={busy} title="Change status" subtitle={`${unit.tag} · ${item.name}`} submitLabel="Update status">
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-[13px] text-muted">
          Current status: <StatusBadge tone={unitStatus(db, item, unit).tone}>{current?.name}</StatusBadge>
          {unit.assignmentId && <Badge>Assigned</Badge>}
        </div>
        <Labeled label="New status" required error={err.status} hint={unit.assignmentId ? 'This asset is assigned: it cannot become Retired, Archived, Undeployable or Pending until returned.' : undefined}>
          <Select value={statusId} onChange={(e) => setStatusId(e.target.value)}>
            <option value="">Select status</option>
            {db.statusLabels.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.statusType})</option>)}
          </Select>
        </Labeled>
        {toMaint &&
        <FormSection title="Maintenance details" description={active ? 'Updates the open maintenance record.' : 'A maintenance record is created for this asset.'}>
            <Labeled label="Repair agent" required error={err.agent}>
              <SearchableSelect value={agent} onChange={setAgent} placeholder="Select repair agent" invalid={Boolean(err.agent)} options={db.suppliers.filter((s) => s.type.includes('repair agent')).map((s) => ({ value: s.id, label: s.name, hint: s.contactName }))} />
            </Labeled>
            <Labeled label="Maintenance status">
              <Select value={mStatus} onChange={(e) => setMStatus(e.target.value as 'pending' | 'in_progress')}>
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
              </Select>
            </Labeled>
            <Labeled label="Maintenance date" required error={err.date}>
              <Input type="date" value={toDateInput(date)} onChange={(e) => setDate(e.target.value)} />
            </Labeled>
            <Labeled label="Expected completion" error={err.expected}>
              <Input type="date" value={toDateInput(expected)} onChange={(e) => setExpected(e.target.value)} />
            </Labeled>
            <Labeled label="Estimated cost (LKR)" error={err.cost}>
              <Input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
            </Labeled>
            <Labeled label="Issue description" wide>
              <Textarea value={issue} onChange={(e) => setIssue(e.target.value)} />
            </Labeled>
            <Labeled label="Notes" wide>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Labeled>
          </FormSection>
        }
        {current?.statusType === 'Under Maintenance' && !toMaint &&
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-[12px] text-sky-800">The open maintenance record will be marked as completed.</p>
        }
      </div>
    </FormDrawer>);

}

// ------------------------------------------------------------------ edit / add units

export function UnitDrawer({ open, onClose, item, unit }: {open: boolean;onClose: () => void;item: Item;unit?: Unit;}) {
  const { db, run, busy } = useStore();
  const editing = Boolean(unit);
  const [count, setCount] = useState(1);
  const [rows, setRows] = useState<ReturnType<typeof blankUnit>[]>([]);
  const [errors, setErrors] = useState<Array<Record<string, string>>>([]);
  const fieldsetId = db.models.find((m) => m.id === item.modelId)?.fieldsetId;

  useEffect(() => {
    if (!open) return;
    setRows([unit ? { ...unit } : blankUnit(item.kind, db)]);
    setCount(1);
    setErrors([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit?.id]);

  const resize = (n: number) => {
    const q = Math.max(1, Math.min(100, n || 1));
    setCount(q);
    setRows((rs) => q >= rs.length ? [...rs, ...Array.from({ length: q - rs.length }, () => blankUnit(item.kind, db))] : rs.slice(0, q));
  };
  const fill = () => {
    const blanks = rows.filter((r) => !r.tag.trim()).length;
    const fresh = generateTags(db, item.assetTypeId, blanks, rows.map((r) => r.tag).filter(Boolean));
    setRows((rs) => {
      let n = 0;
      return rs.map((r) => r.tag.trim() ? r : { ...r, tag: fresh[n++] ?? '' });
    });
  };

  const submit = async () => {
    const es = rows.map((r) => validateUnitForm(item.kind, db, r, fieldsetId, !editing));
    setErrors(es);
    if (es.some((e) => Object.keys(e).length)) return;
    const clean = rows.map((r) => ({ ...r, serial: r.serial?.trim() || undefined, licenseKey: r.licenseKey?.trim() || undefined }));
    const r = editing ?
    await run((d) => updateUnit(d, item.id, unit!.id, clean[0]), `${clean[0].tag} updated`) :
    await run((d) => addUnits(d, item.id, clean), `${clean.length} record${clean.length > 1 ? 's' : ''} added`);
    if (r.ok) onClose();
  };

  return (
    <FormDrawer open={open} onClose={onClose} onSubmit={submit} busy={busy} size="lg" title={editing ? `Edit ${unit?.tag}` : item.kind === 'license' ? 'Add seats' : 'Add individual records'} subtitle={item.name} submitLabel={editing ? 'Save changes' : 'Add records'}>
      {!editing &&
      <div className="mb-4 flex items-center gap-2">
          <label className="text-[12px] text-muted" htmlFor="addqty">Quantity</label>
          <Input id="addqty" type="number" min={1} max={100} className="h-9 w-20" value={count} onChange={(e) => resize(Number(e.target.value))} />
          <Button size="sm" onClick={fill}>Generate tags</Button>
        </div>
      }
      <div className="space-y-3">
        {rows.map((r, idx) =>
        <div key={idx} className={editing ? '' : 'rounded-xl border border-line bg-slate-50/50 p-4'}>
            {!editing && <p className="mb-3 text-[12px] font-semibold text-muted">Record {idx + 1}</p>}
            <UnitFields kind={item.kind} db={db} value={r} errors={errors[idx]} compact={!editing} fieldsetId={fieldsetId} statusEditable={!editing} onChange={(n) => setRows((rs) => rs.map((x, i) => i === idx ? n : x))} />
          </div>
        )}
      </div>
    </FormDrawer>);

}

export function DeleteUnitDialog({ open, onClose, item, unit }: {open: boolean;onClose: () => void;item: Item;unit?: Unit;}) {
  const { run, busy } = useStore();
  if (!unit) return null;
  return (
    <Dialog
      open={open}
      busy={busy}
      title={`Delete ${unit.tag}?`}
      body="This permanently removes the record and its assignment and maintenance history. This cannot be undone."
      confirmLabel="Delete"
      confirmVariant="danger"
      onCancel={onClose}
      onConfirm={async () => {
        const r = await run((d) => deleteUnit(d, item.id, unit.id), `${unit.tag} deleted`);
        if (r.ok) onClose();
      }} />);

}

// ------------------------------------------------------------------ handover form

export function HandoverDrawer({ open, onClose, assignmentIds }: {open: boolean;onClose: () => void;assignmentIds?: string[];}) {
  const { db } = useStore();
  const list = (assignmentIds ?? []).map((id) => db.assignments.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  const first = list[0];
  const firstItem = findItem(db, first?.itemId);
  const company = db.companies.find((c) => c.id === firstItem?.companyId);
  const emp = db.employees.find((e) => e.id === first?.toEmployeeId);
  const returned = list.length > 0 && list.every((a) => a.returnedAt);
  const title = returned ? 'Asset Return Form' : 'Asset Handover Form';

  if (!first || !firstItem) return null;
  return (
    <FormDrawer open={open} onClose={onClose} size="lg" title={title} subtitle="Preview, print or save as PDF from the print dialog" hideSubmit>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={() => window.print()}>Print form</Button>
      </div>
      <div className="print-area rounded-xl border border-line bg-white p-8 text-[13px] text-ink shadow-card">
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <p className="text-lg font-semibold">{company?.name}</p>
            <p className="text-muted">{title}</p>
          </div>
          <p className="text-right text-[12px] text-muted">Form date<br /><span className="font-medium text-ink">{formatDate(new Date().toISOString())}</span></p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-subtle">{returned ? 'Returned by' : 'Issued to'}</p>
            <p className="mt-1 font-medium">{emp?.name ?? assigneeLabel(db, first)}</p>
            {emp && <p className="text-muted">{emp.position} · {db.departments.find((d) => d.id === emp.departmentId)?.name}</p>}
            {emp && <p className="text-muted">{emp.email}</p>}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-subtle">Issued by</p>
            <p className="mt-1 font-medium">{employeeName(db, first.assignedBy)}</p>
            <p className="text-muted">Asset Management</p>
          </div>
        </div>
        <table className="mt-6 w-full border border-line text-left">
          <thead className="bg-slate-50 text-[11px] uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Tag</th>
              <th className="px-3 py-2">Serial / key</th>
              <th className="px-3 py-2">Assigned</th>
              <th className="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => {
              const item = findItem(db, a.itemId);
              const unit = item?.units.find((u) => u.id === a.unitId);
              return (
                <tr key={a.id} className="border-t border-line align-top">
                  <td className="px-3 py-2">{item ? kindLabel[item.kind] : ''}</td>
                  <td className="px-3 py-2">{item?.name}</td>
                  <td className="px-3 py-2">{unit?.tag}</td>
                  <td className="px-3 py-2">{unit?.serial ?? unit?.licenseKey ?? '-'}</td>
                  <td className="px-3 py-2">{formatDate(a.assignedAt)}</td>
                  <td className="px-3 py-2">{a.returnedAt ? a.returnNotes || a.condition : unit?.handoverNotes ?? a.notes ?? '-'}</td>
                </tr>);

            })}
          </tbody>
        </table>
        <p className="mt-6 text-[12px] leading-relaxed text-muted">
          I confirm that I have {returned ? 'returned' : 'received'} the item(s) listed above in the stated condition. I will use company assets responsibly, in line with company policy, and report any loss or damage immediately.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-10">
          <div className="border-t border-slate-400 pt-1.5 text-[12px] text-muted">Employee signature and date</div>
          <div className="border-t border-slate-400 pt-1.5 text-[12px] text-muted">Asset manager signature and date</div>
        </div>
      </div>
    </FormDrawer>);

}

export const AssigneeCell = ({ name, sub }: {name: string;sub?: string;}) =>
<div className="flex items-center gap-2.5">
    <Avatar name={name} size="sm" />
    <div className="min-w-0 leading-tight">
      <p className="truncate text-[13px] text-ink">{name}</p>
      {sub && <p className="truncate text-[11px] text-muted">{sub}</p>}
    </div>
  </div>;


