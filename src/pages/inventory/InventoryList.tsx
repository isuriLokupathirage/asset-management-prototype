import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangleIcon, CpuIcon, KeyRoundIcon, LaptopIcon, MouseIcon, PlusIcon } from 'lucide-react';
import type { Item, Kind } from '../../types';
import { kindLabel, kindPlural } from '../../types';
import { useStore } from '../../store/AppStore';
import { assigneeLabel, bulkRemove, currentAssignmentOf, deleteItem, itemCounts, unitStatus } from '../../services/domain';
import { PageBody, PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { TableToolbar } from '../../components/ui/TableToolbar';
import { Menu } from '../../components/ui/Menu';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { ItemDetailModal } from './ItemDetail';
import { ItemFormDrawer } from '../../components/inventory/ItemFormDrawer';
import { AssignDrawer } from '../../components/inventory/ActionDrawers';
import { downloadExcel, formatDate, formatMoney } from '../../utils/format';

const icons: Record<Kind, React.ComponentType<{className?: string;}>> = { asset: LaptopIcon, license: KeyRoundIcon, component: CpuIcon, accessory: MouseIcon };
const descriptions: Record<Kind, string> = {
  asset: 'Manage assets for your organization',
  license: 'Manage software licenses and their seats',
  component: 'Manage components such as memory and storage',
  accessory: 'Manage accessories such as mice, keyboards and docks'
};

export function InventoryList({ kind }: {kind: Kind;}) {
  const { db, run, busy, notify, notifyError } = useStore();
  const navigate = useNavigate();
  const { id: openId } = useParams();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Item>();
  const [assigning, setAssigning] = useState<Item>();
  const [deleting, setDeleting] = useState<Item[]>([]);

  const modelOf = (i: Item) => db.models.find((m) => m.id === i.modelId);
  const categoryName = (i: Item) => db.categories.find((c) => c.id === (i.categoryId ?? modelOf(i)?.categoryId))?.name ?? '';
  const manufacturerOf = (i: Item) => db.manufacturers.find((m) => m.id === (i.manufacturerId ?? modelOf(i)?.manufacturerId))?.name ?? '';
  const companyName = (i: Item) => db.companies.find((c) => c.id === i.companyId)?.name ?? '';
  const departmentName = (i: Item) => db.departments.find((d) => d.id === i.departmentId)?.name ?? '';
  const statusSummary = (i: Item) => {
    const names = [...new Set(i.units.map((u) => unitStatus(db, i, u)))];
    const unique = [...new Map(names.map((s) => [s.name, s])).values()];
    return unique.length === 1 ? unique[0] : { name: 'Mixed', tone: 'slate' as const };
  };

  const all = useMemo(() => db.items.filter((i) => i.kind === kind), [db.items, kind]);
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return all;
    return all.filter((i) => [i.name, manufacturerOf(i), modelOf(i)?.name, i.modelNumber, i.notes, ...i.units.flatMap((u) => [u.tag, u.serial, u.licenseKey])].join(' ').toLowerCase().includes(n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, q, db]);

  const lowStock = (i: Item) => itemCounts(db, i).available < i.minQty;
  const nextExpiry = (i: Item) => i.units.map((u) => u.expirationDate).filter(Boolean).sort()[0];
  const base = `/${kindPlural[kind].toLowerCase()}`;

  const columns: Column<Item>[] = [
  {
    key: 'name',
    header: kind === 'license' ? 'Software' : `${kindLabel[kind]} Name`,
    title: 'Name',
    sort: (i) => i.name.toLowerCase(),
    filter: 'text',
    filterLabel: 'name',
    render: (i) =>
    <div className="min-w-[170px]">
          <Link to={`${base}/${i.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-ink hover:text-brand-600">{i.name}</Link>
          <p className="text-[11px] text-muted">{[modelOf(i)?.name, manufacturerOf(i), i.modelNumber].filter(Boolean).join(' · ') || ' '}</p>
        </div>

  },
  {
    key: 'total',
    header: kind === 'license' ? 'Seats' : kind === 'asset' ? 'Total Assets' : 'Total',
    sort: (i) => i.units.length,
    render: (i) => i.units.length
  },
  {
    key: 'available',
    header: 'Available',
    sort: (i) => itemCounts(db, i).available,
    render: (i) => {
      const n = itemCounts(db, i).available;
      const low = lowStock(i);
      return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`inline-flex min-w-[28px] justify-center rounded-md px-2 py-0.5 text-[12px] font-semibold ${low ? 'bg-red-500 text-white' : 'bg-emerald-100 text-emerald-800'}`}>{n}</span>
            {low && <span title={`Below the minimum of ${i.minQty}`}><AlertTriangleIcon className="h-3.5 w-3.5 text-amber-600" /></span>}
          </span>);

    }
  },
  {
    key: 'status',
    header: 'Status',
    sort: (i) => statusSummary(i).name,
    filter: 'select',
    filterValue: (i) => statusSummary(i).name,
    render: (i) => {
      const s = statusSummary(i);
      return <StatusBadge tone={s.tone}>{s.name}</StatusBadge>;
    }
  },
  ...(kind === 'license' ? [{
    key: 'expiry',
    header: 'Next Expiry',
    sort: (i: Item) => nextExpiry(i) ?? '9999',
    render: (i: Item) => formatDate(nextExpiry(i)) || '-'
  }] : []),
  {
    key: 'category',
    header: 'Category',
    sort: categoryName,
    filter: 'select',
    filterValue: categoryName,
    render: (i) => categoryName(i) || '-'
  },
  {
    key: 'company',
    header: 'Company',
    sort: companyName,
    filter: 'select',
    filterValue: companyName,
    render: (i) => <span className="text-muted">{companyName(i)}</span>
  },
  ...(kind === 'asset' ? [{
    key: 'department',
    header: 'Department',
    sort: departmentName,
    filter: 'select' as const,
    filterValue: departmentName,
    render: (i: Item) => <span className="text-muted">{departmentName(i) || '-'}</span>
  }] : []),
  {
    key: 'notes',
    header: 'Notes',
    filter: 'text',
    filterLabel: 'notes',
    filterValue: (i) => i.notes ?? '',
    sort: (i) => i.notes ?? '',
    render: (i) => <span className="line-clamp-2 max-w-[160px] text-muted">{i.notes || 'N/A'}</span>
  },
  {
    key: 'cost',
    header: kind === 'asset' || kind === 'license' ? 'Total Cost' : 'Unit Cost',
    sort: (i) => i.cost ?? 0,
    defaultHidden: true,
    render: (i) => <span className="whitespace-nowrap text-muted">{formatMoney(i.cost) || '-'}</span>
  },
  {
    key: 'updated',
    header: 'Updated Date',
    sort: (i) => i.updatedAt,
    render: (i) => <span className="whitespace-nowrap text-muted">{formatDate(i.updatedAt)}</span>
  },
  {
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    align: 'right',
    render: (i) =>
    <Menu
      label={`Actions for ${i.name}`}
      items={[
      { label: 'View details', onSelect: () => navigate(`${base}/${i.id}`) },
      { label: 'Assign', onSelect: () => setAssigning(i), disabled: itemCounts(db, i).available === 0, hint: 'Nothing available to assign' },
      { label: 'Edit', onSelect: () => setEditing(i) },
      { label: 'Delete', danger: true, onSelect: () => setDeleting([i]) }]
      } />

  }];


  const exportExcel = (list: Item[]) =>
  downloadExcel(`${kindPlural[kind].toLowerCase()}.xls`,
  ['Name', 'Tag', 'Serial / key', 'Status', 'Assigned to', 'Company'],
  list.flatMap((i) => i.units.map((u) => {
    const a = currentAssignmentOf(db, u);
    return [i.name, u.tag, u.serial ?? u.licenseKey, unitStatus(db, i, u).name, a ? assigneeLabel(db, a) : '', companyName(i)];
  })));


  const unitsPanel = (i: Item) =>
  <table className="w-full text-left text-[13px]">
      <thead>
        <tr className="text-[11px] uppercase tracking-wide text-muted">
          <th className="py-1 pr-4 font-semibold">Tag</th>
          <th className="py-1 pr-4 font-semibold">{kind === 'license' ? 'License key' : 'Serial'}</th>
          <th className="py-1 pr-4 font-semibold">Status</th>
          <th className="py-1 font-semibold">Assigned to</th>
        </tr>
      </thead>
      <tbody>
        {i.units.map((u) => {
        const s = unitStatus(db, i, u);
        const a = currentAssignmentOf(db, u);
        return (
          <tr key={u.id} className="border-t border-line/70">
              <td className="py-1.5 pr-4 font-medium">{u.tag}</td>
              <td className="py-1.5 pr-4 font-mono text-[12px] text-muted">{(kind === 'license' ? u.licenseKey : u.serial) || '-'}</td>
              <td className="py-1.5 pr-4"><StatusBadge tone={s.tone}>{s.name}</StatusBadge>{s.assigned && kind === 'asset' && <Badge className="ml-1.5 bg-sky-50 text-sky-700 ring-sky-200">Assigned</Badge>}</td>
              <td className="py-1.5">{a ? assigneeLabel(db, a) : <span className="text-subtle">-</span>}</td>
            </tr>);

      })}
      </tbody>
    </table>;


  return (
    <>
      <PageHeader
        title={`${kindPlural[kind]} Management`}
        icon={icons[kind]}
        subtitle={descriptions[kind]}
        actions={<Button variant="primary" onClick={() => setCreating(true)}><PlusIcon className="h-4 w-4" />Add {kindLabel[kind]}</Button>} />
      <PageBody>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(i) => i.id}
          selectable
          columnsMenu
          onRowClick={(i) => navigate(`${base}/${i.id}`)}
          expandable={{ render: unitsPanel }}
          initialSort={{ key: 'updated', dir: 'desc' }}
          toolbar={({ rows: shown, selected }) =>
          <TableToolbar
            search={q}
            onSearch={setQ}
            placeholder={`Search ${kindPlural[kind].toLowerCase()}...`}
            onExport={() => exportExcel(shown)}
            exportDisabled={shown.length === 0}
            selectedCount={selected.length}
            onDeleteSelected={() => setDeleting(selected)} />
          }
          emptyTitle={all.length === 0 ? `No ${kindPlural[kind].toLowerCase()} yet` : 'No matches'}
          emptyDescription={all.length === 0 ? `Add your first ${kindLabel[kind].toLowerCase()} to start tracking it.` : 'Try a different search.'}
          emptyAction={all.length === 0 ? <Button variant="primary" onClick={() => setCreating(true)}>Add {kindLabel[kind]}</Button> : undefined} />
      </PageBody>

      <ItemFormDrawer kind={kind} open={creating} onClose={() => setCreating(false)} onSaved={(id) => navigate(`${base}/${id}`)} />
      {openId && <ItemDetailModal kind={kind} id={openId} onClose={() => navigate(base)} />}
      {editing && <ItemFormDrawer kind={kind} item={editing} open onClose={() => setEditing(undefined)} />}
      {assigning && <AssignDrawer open item={assigning} onClose={() => setAssigning(undefined)} />}
      <Dialog
        open={deleting.length > 0}
        busy={busy}
        title={deleting.length === 1 ? `Delete ${deleting[0].name}?` : `Delete ${deleting.length} ${kindPlural[kind].toLowerCase()}?`}
        body="This permanently removes the record, all of its individual items, and their history. Records with active assignments cannot be deleted and are skipped."
        confirmLabel="Delete"
        confirmVariant="danger"
        onCancel={() => setDeleting([])}
        onConfirm={async () => {
          const ids = deleting.map((i) => i.id);
          const r = await run((d) => {
            const out = bulkRemove(d, ids, deleteItem);
            return { db: out.db, result: out };
          });
          const out = r.result;
          if (out) {
            if (out.done === 0) notifyError(out.firstError ?? 'Nothing was deleted');
            else if (out.failed > 0) notify(`${out.done} deleted, ${out.failed} skipped: ${out.firstError}`);
            else notify(out.done === 1 ? 'Deleted' : `${out.done} deleted`);
          }
          setDeleting([]);
        }} />
    </>);
}
