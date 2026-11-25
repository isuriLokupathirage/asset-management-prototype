import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileTextIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import type { Assignment, HistoryEvent, Item, Kind, Unit } from '../../types';
import { kindLabel, kindPlural, unitLabel } from '../../types';
import { useStore } from '../../store/AppStore';
import { assigneeLabel, deleteItem, employeeName, findItem, itemCounts, unitStatus } from '../../services/domain';
import { PageBody, PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, Detail, Tabs } from '../../components/ui/Tabs';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Menu } from '../../components/ui/Menu';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ItemFormDrawer } from '../../components/inventory/ItemFormDrawer';
import { AssignDrawer, DeleteUnitDialog, HandoverDrawer, ReturnDrawer, StatusDrawer, UnitDrawer } from '../../components/inventory/ActionDrawers';
import { MaintenanceTable } from '../../components/inventory/MaintenanceTable';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format';
import { HistoryIcon } from 'lucide-react';

export function ItemDetail({ kind }: {kind: Kind;}) {
  const { id } = useParams();
  const { db, run, busy } = useStore();
  const navigate = useNavigate();
  const item = findItem(db, id);
  const [tab, setTab] = useState('details');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assign, setAssign] = useState<{unit?: Unit;} | null>(null);
  const [returning, setReturning] = useState<string>();
  const [statusUnit, setStatusUnit] = useState<Unit>();
  const [unitForm, setUnitForm] = useState<{unit?: Unit;} | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<Unit>();
  const [handover, setHandover] = useState<string>();

  const base = `/${kindPlural[kind].toLowerCase()}`;
  if (!item || item.kind !== kind) {
    return (
      <>
        <PageHeader title={`${kindLabel[kind]} not found`} backTo={base} backLabel={kindPlural[kind]} />
        <PageBody><EmptyState icon={FileTextIcon} title="This record does not exist" description="It may have been deleted." action={<Link to={base}><Button variant="primary">Back to {kindPlural[kind].toLowerCase()}</Button></Link>} /></PageBody>
      </>);

  }

  const counts = itemCounts(db, item);
  const itemAssignments = db.assignments.filter((a) => a.itemId === item.id);
  const hosted = db.assignments.filter((a) => a.toItemId === item.id && !a.returnedAt);
  const maint = db.maintenance.filter((m) => m.itemId === item.id);
  const events = db.history.filter((h) => h.itemId === item.id);
  const model = db.models.find((m) => m.id === item.modelId);
  const category = db.categories.find((c) => c.id === (item.categoryId ?? model?.categoryId))?.name;
  const manufacturer = db.manufacturers.find((m) => m.id === (item.manufacturerId ?? model?.manufacturerId))?.name;
  const underMaintenance = item.units.filter((u) => unitStatus(db, item, u).tone === 'violet').length;

  const tabs = [
  { id: 'details', label: 'Details' },
  { id: 'units', label: kind === 'license' ? 'Seats' : 'Individual records', count: item.units.length },
  { id: 'assignments', label: 'Assignments', count: itemAssignments.length },
  ...(kind === 'asset' ? [{ id: 'assigned', label: 'Assigned items', count: hosted.length }, { id: 'maintenance', label: 'Maintenance', count: maint.length }] : []),
  { id: 'history', label: 'History', count: events.length }];


  const unitCols: Column<Unit>[] = [
  { key: 'tag', header: 'Tag', sort: (u) => u.tag, render: (u) => <span className="font-medium">{u.tag}</span> },
  { key: 'serial', header: kind === 'license' ? 'License key' : 'Serial', render: (u) => <span className="font-mono text-[12px] text-muted">{kind === 'license' ? u.licenseKey : u.serial || '-'}</span> },
  {
    key: 'status',
    header: 'Status',
    sort: (u) => unitStatus(db, item, u).name,
    render: (u) => {
      const s = unitStatus(db, item, u);
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
            <StatusBadge tone={s.tone}>{s.name}</StatusBadge>
            {s.assigned && kind === 'asset' && <Badge className="bg-sky-50 text-sky-700 ring-sky-200">Assigned</Badge>}
          </span>);

    }
  },
  {
    key: 'assignee',
    header: 'Assigned to',
    render: (u) => {
      const a = db.assignments.find((x) => x.id === u.assignmentId);
      return a ? <span className="text-ink">{assigneeLabel(db, a)}</span> : <span className="text-subtle">-</span>;
    }
  },
  {
    key: 'date',
    header: kind === 'asset' ? 'Warranty / EOL' : kind === 'license' ? 'Expires' : 'Warranty',
    sort: (u) => u.expirationDate ?? u.warrantyExpiry ?? '',
    render: (u) => {
      if (kind === 'license') return u.expirationDate ? formatDate(u.expirationDate) : '-';
      if (kind === 'asset') return <span className="text-muted">{formatDate(u.warrantyExpiry) || '-'} / {formatDate(u.eolDate) || '-'}</span>;
      return formatDate(u.warrantyExpiry) || '-';
    }
  },
  {
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    align: 'right',
    render: (u) => {
      const s = unitStatus(db, item, u);
      return (
        <Menu
          label={`Actions for ${u.tag}`}
          items={[
          { label: 'Assign', disabled: !s.available, hint: s.assigned ? 'Already assigned' : 'Not available for assignment', onSelect: () => setAssign({ unit: u }) },
          { label: 'Return', disabled: !s.assigned, hint: 'Not currently assigned', onSelect: () => setReturning(u.assignmentId) },
          ...(kind === 'asset' ? [{ label: 'Change status / send for maintenance', onSelect: () => setStatusUnit(u) }] : []),
          { label: 'Handover form', disabled: !s.assigned, hint: 'Not currently assigned', onSelect: () => setHandover(u.assignmentId) },
          { label: 'Edit', onSelect: () => setUnitForm({ unit: u }) },
          { label: 'Delete', danger: true, onSelect: () => setDeleteUnit(u) }]
          } />);

    }
  }];


  const assignmentCols = (withReturn: boolean): Column<Assignment>[] => [
  {
    key: 'unit',
    header: 'Item',
    sort: (a) => findItem(db, a.itemId)?.units.find((u) => u.id === a.unitId)?.tag ?? '',
    render: (a) => {
      const it = findItem(db, a.itemId);
      return <div><p className="font-medium">{it?.units.find((u) => u.id === a.unitId)?.tag}</p>{a.itemId !== item.id && <p className="text-[11px] text-muted">{it?.name}</p>}</div>;
    }
  },
  { key: 'to', header: 'Assigned to', sort: (a) => assigneeLabel(db, a), render: (a) => assigneeLabel(db, a) },
  { key: 'at', header: 'Assigned', sort: (a) => a.assignedAt, render: (a) => formatDate(a.assignedAt) },
  { key: 'by', header: 'By', render: (a) => <span className="text-muted">{employeeName(db, a.assignedBy)}</span> },
  {
    key: 'state',
    header: 'Status',
    sort: (a) => a.returnedAt ? 'b' : 'a',
    render: (a) => a.returnedAt ?
    <span className="inline-flex flex-col gap-0.5"><StatusBadge tone={a.condition === 'Good' ? 'slate' : a.condition === 'Damaged' ? 'amber' : 'red'}>Returned {formatDate(a.returnedAt)}</StatusBadge>{a.returnNotes && <span className="text-[11px] text-muted">{a.returnNotes}</span>}</span> :
    <StatusBadge tone="blue">Active</StatusBadge>
  },
  {
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    align: 'right',
    render: (a) =>
    <Menu items={[
    ...(withReturn ? [{ label: 'Return', disabled: Boolean(a.returnedAt), hint: 'Already returned', onSelect: () => setReturning(a.id) }] : []),
    { label: a.returnedAt ? 'Return form' : 'Handover form', onSelect: () => setHandover(a.id) }]
    } />

  }];


  const historyList = (list: HistoryEvent[]) =>
  list.length === 0 ? <EmptyState icon={HistoryIcon} title="No history yet" /> :
  <ol className="relative ml-2 border-l border-line">
      {list.slice(0, 100).map((h) =>
    <li key={h.id} className="mb-4 ml-5">
          <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-400 ring-1 ring-brand-200" />
          <p className="text-[13px] font-medium text-ink">{h.action}</p>
          {h.detail && <p className="text-[13px] text-muted">{h.detail}</p>}
          <p className="mt-0.5 text-[11px] text-subtle">{formatDateTime(h.at)} · {employeeName(db, h.by)}</p>
        </li>
    )}
    </ol>;


  return (
    <>
      <PageHeader
        title={item.name}
        backTo={base}
        backLabel={kindPlural[kind]}
        subtitle={[model?.name, manufacturer, db.companies.find((c) => c.id === item.companyId)?.name].filter(Boolean).join(' · ')}
        actions={
        <>
            <Button onClick={() => setEditing(true)}><PencilIcon className="h-4 w-4" />Edit</Button>
            <Button variant="primary" disabled={counts.available === 0} title={counts.available === 0 ? 'Nothing available to assign' : undefined} onClick={() => setAssign({})}>Assign</Button>
            <Button variant="ghost" aria-label="Delete" onClick={() => setDeleting(true)}><Trash2Icon className="h-4 w-4" /></Button>
          </>
        } />
      <PageBody>
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
          { label: kind === 'license' ? 'Total seats' : 'Total', value: counts.total },
          { label: 'Available', value: counts.available, warn: counts.available < item.minQty },
          { label: 'Assigned', value: counts.assigned },
          { label: kind === 'asset' ? 'Under maintenance' : 'Minimum quantity', value: kind === 'asset' ? underMaintenance : item.minQty }].
          map((s) =>
          <div key={s.label} className="rounded-xl border border-line bg-white px-4 py-3 shadow-card">
              <p className="text-[12px] text-muted">{s.label}</p>
              <p className={`mt-1 text-2xl font-semibold ${s.warn ? 'text-amber-600' : 'text-ink'}`}>{s.value}</p>
              {s.warn && <p className="text-[11px] text-amber-700">Below the minimum of {item.minQty}</p>}
            </div>
          )}
        </div>

        <Tabs tabs={tabs} active={tab} onChange={setTab} />
        <div className="mt-5">
          {tab === 'details' &&
          <div className="grid gap-5 lg:grid-cols-2">
              <Card title="General">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Detail label="Company">{db.companies.find((c) => c.id === item.companyId)?.name}</Detail>
                  {kind === 'asset' && <Detail label="Department">{db.departments.find((d) => d.id === item.departmentId)?.name}</Detail>}
                  {kind === 'asset' && <Detail label="Model">{model?.name}</Detail>}
                  <Detail label="Category">{category}</Detail>
                  <Detail label="Manufacturer">{manufacturer}</Detail>
                  <Detail label="Asset type">{db.assetTypes.find((t) => t.id === item.assetTypeId)?.name} {item.assetTypeId && <span className="text-muted">({db.assetTypes.find((t) => t.id === item.assetTypeId)?.pattern})</span>}</Detail>
                  {item.modelNumber && <Detail label="Model number">{item.modelNumber}</Detail>}
                  <Detail label="Added">{formatDate(item.createdAt)}</Detail>
                  <Detail label="Last updated">{formatDate(item.updatedAt)}</Detail>
                  <div className="sm:col-span-2"><Detail label="Notes">{item.notes}</Detail></div>
                </dl>
              </Card>
              <Card title="Order and invoice">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Detail label="Supplier">{db.suppliers.find((s) => s.id === item.supplierId)?.name}</Detail>
                  <Detail label="Order number">{item.orderNumber}</Detail>
                  {kind === 'license' && <Detail label="Purchase order">{item.purchaseOrderNumber}</Detail>}
                  <Detail label={kind === 'asset' || kind === 'license' ? 'Total cost' : 'Unit cost'}>{formatMoney(item.cost)}</Detail>
                  <Detail label="Purchase date">{formatDate(item.purchaseDate)}</Detail>
                  <Detail label="Invoice number">{item.invoiceNumber}</Detail>
                  <Detail label="Invoice date">{formatDate(item.invoiceDate)}</Detail>
                  <Detail label="Invoice file">{item.invoiceFileName && <span className="inline-flex items-center gap-1.5 text-brand-700"><FileTextIcon className="h-4 w-4" />{item.invoiceFileName}</span>}</Detail>
                </dl>
              </Card>
              {kind === 'license' &&
            <Card title="Licensing" className="lg:col-span-2">
                  <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    <Detail label="Licensed to">{item.licensedToName}</Detail>
                    <Detail label="Licensed email">{item.licensedToEmail}</Detail>
                    <Detail label="Reassignable">{item.reassignable ? 'Yes' : 'No'}</Detail>
                    <Detail label="Maintained">{item.maintained ? 'Yes' : 'No'}</Detail>
                    <Detail label="Termination date">{formatDate(item.terminationDate)}</Detail>
                  </dl>
                </Card>
            }
            </div>
          }

          {tab === 'units' &&
          <>
              <div className="mb-3 flex justify-end">
                <Button onClick={() => setUnitForm({})}><PlusIcon className="h-4 w-4" />{kind === 'license' ? 'Add seats' : 'Add records'}</Button>
              </div>
              <DataTable columns={unitCols} rows={item.units} rowKey={(u) => u.id} pageSize={10} emptyTitle={`No ${unitLabel[kind].toLowerCase()}s`} />
            </>
          }
          {tab === 'assignments' &&
          <DataTable columns={assignmentCols(true)} rows={itemAssignments} rowKey={(a) => a.id} pageSize={8} initialSort={{ key: 'at', dir: 'desc' }} emptyTitle="No assignments yet" emptyDescription="Assign an available record to a user or another asset." />
          }
          {tab === 'assigned' &&
          <DataTable
            columns={[
            { key: 'item', header: 'Item', render: (a: Assignment) => { const it = findItem(db, a.itemId); return <div><p className="font-medium">{it?.units.find((u) => u.id === a.unitId)?.tag}</p><p className="text-[11px] text-muted">{it?.name} · {kindLabel[a.kind]}</p></div>; } },
            { key: 'host', header: 'Fitted to / used with', render: (a: Assignment) => item.units.find((u) => u.id === a.toUnitId)?.tag ?? '-' },
            { key: 'at', header: 'Since', render: (a: Assignment) => formatDate(a.assignedAt) },
            { key: 'n', header: 'Notes', render: (a: Assignment) => <span className="text-muted">{a.notes || '-'}</span> },
            { key: 'act', header: <span className="sr-only">Actions</span>, align: 'right' as const, render: (a: Assignment) => <Button size="sm" onClick={() => setReturning(a.id)}>Return</Button> }]
            }
            rows={hosted}
            rowKey={(a) => a.id}
            emptyTitle="Nothing is assigned to this asset"
            emptyDescription="Components, accessories, licenses and other assets assigned to one of its units appear here." />
          }
          {tab === 'maintenance' && <MaintenanceTable records={maint} />}
          {tab === 'history' && <Card>{historyList(events)}</Card>}
        </div>
      </PageBody>

      {editing && <ItemFormDrawer kind={kind} item={item} open onClose={() => setEditing(false)} />}
      {assign && <AssignDrawer open item={item} unit={assign.unit} onClose={() => setAssign(null)} />}
      <ReturnDrawer open={Boolean(returning)} assignmentId={returning} onClose={() => setReturning(undefined)} />
      {statusUnit && <StatusDrawer open item={item} unit={statusUnit} onClose={() => setStatusUnit(undefined)} />}
      {unitForm && <UnitDrawer open item={item} unit={unitForm.unit} onClose={() => setUnitForm(null)} />}
      <DeleteUnitDialog open={Boolean(deleteUnit)} item={item} unit={deleteUnit} onClose={() => setDeleteUnit(undefined)} />
      <HandoverDrawer open={Boolean(handover)} assignmentId={handover} onClose={() => setHandover(undefined)} />
      <Dialog
        open={deleting}
        busy={busy}
        title={`Delete ${item.name}?`}
        body="This permanently removes the record, all individual items and their history. A record with active assignments cannot be deleted."
        confirmLabel="Delete"
        confirmVariant="danger"
        onCancel={() => setDeleting(false)}
        onConfirm={async () => {
          const r = await run((d) => deleteItem(d, item.id), `${item.name} deleted`);
          setDeleting(false);
          if (r.ok) navigate(base);
        }} />
    </>);

}

export type { Item };
