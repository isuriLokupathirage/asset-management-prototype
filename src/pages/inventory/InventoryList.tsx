import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangleIcon, DownloadIcon, PlusIcon } from 'lucide-react';
import type { Item, Kind } from '../../types';
import { kindLabel, kindPlural } from '../../types';
import { useStore } from '../../store/AppStore';
import { deleteItem, itemCounts } from '../../services/domain';
import { PageBody, PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Field';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Menu } from '../../components/ui/Menu';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { ItemFormDrawer } from '../../components/inventory/ItemFormDrawer';
import { AssignDrawer } from '../../components/inventory/ActionDrawers';
import { downloadCsv, formatDate, formatMoney } from '../../utils/format';

const descriptions: Record<Kind, string> = {
  asset: 'Hardware that is tracked individually by tag and serial number, and assigned to people or other assets.',
  license: 'Software licenses and their seats. Each seat is assigned to a user or an asset.',
  component: 'Internal parts such as memory and storage that are fitted into assets.',
  accessory: 'Peripherals such as mice, keyboards and docks that are issued to users.'
};

export function InventoryList({ kind }: {kind: Kind;}) {
  const { db, run, busy } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Item>();
  const [assigning, setAssigning] = useState<Item>();
  const [deleting, setDeleting] = useState<Item>();

  const modelOf = (i: Item) => db.models.find((m) => m.id === i.modelId);
  const categoryOf = (i: Item) => i.categoryId ?? modelOf(i)?.categoryId;
  const manufacturerOf = (i: Item) => db.manufacturers.find((m) => m.id === (i.manufacturerId ?? modelOf(i)?.manufacturerId))?.name ?? '';

  const all = useMemo(() => db.items.filter((i) => i.kind === kind), [db.items, kind]);
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return all.filter((i) => {
      if (company && i.companyId !== company) return false;
      if (category && categoryOf(i) !== category) return false;
      const c = itemCounts(db, i);
      if (availability === 'available' && c.available === 0) return false;
      if (availability === 'none' && c.available > 0) return false;
      if (availability === 'low' && c.available >= i.minQty) return false;
      if (!n) return true;
      const hay = [i.name, manufacturerOf(i), modelOf(i)?.name, i.modelNumber, ...i.units.flatMap((u) => [u.tag, u.serial, u.licenseKey])].join(' ').toLowerCase();
      return hay.includes(n);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, q, company, category, availability, db]);

  const lowStock = (i: Item) => itemCounts(db, i).available < i.minQty;
  const nextExpiry = (i: Item) => i.units.map((u) => u.expirationDate).filter(Boolean).sort()[0];

  const columns: Column<Item>[] = [
  {
    key: 'name',
    header: kind === 'license' ? 'Software' : 'Name',
    sort: (i) => i.name.toLowerCase(),
    render: (i) =>
    <div className="min-w-[180px]">
          <p className="font-medium text-ink">{i.name}</p>
          <p className="text-[11px] text-muted">{[modelOf(i)?.name, manufacturerOf(i), i.modelNumber].filter(Boolean).join(' · ') || ' '}</p>
        </div>

  },
  {
    key: 'total',
    header: kind === 'license' ? 'Seats' : 'Total',
    sort: (i) => i.units.length,
    render: (i) => i.units.length
  },
  {
    key: 'available',
    header: 'Available',
    sort: (i) => itemCounts(db, i).available,
    render: (i) =>
    <span className="inline-flex items-center gap-1.5">
          {itemCounts(db, i).available}
          {lowStock(i) && <Badge className="bg-amber-50 text-amber-800 ring-amber-200"><AlertTriangleIcon className="h-3 w-3" />Low</Badge>}
        </span>

  },
  {
    key: 'assigned',
    header: 'Assigned',
    sort: (i) => itemCounts(db, i).assigned,
    render: (i) => itemCounts(db, i).assigned
  },
  ...(kind === 'license' ? [{
    key: 'expiry',
    header: 'Next expiry',
    sort: (i: Item) => nextExpiry(i) ?? '9999',
    render: (i: Item) => formatDate(nextExpiry(i)) || '-'
  }] : []),
  {
    key: 'category',
    header: 'Category',
    sort: (i) => db.categories.find((c) => c.id === categoryOf(i))?.name ?? '',
    render: (i) => db.categories.find((c) => c.id === categoryOf(i))?.name ?? '-'
  },
  {
    key: 'company',
    header: kind === 'asset' ? 'Company / department' : 'Company',
    sort: (i) => db.companies.find((c) => c.id === i.companyId)?.name ?? '',
    render: (i) => <div className="max-w-[190px] leading-tight"><p className="truncate text-muted">{db.companies.find((c) => c.id === i.companyId)?.name}</p>{kind === 'asset' && <p className="truncate text-[11px] text-subtle">{db.departments.find((d) => d.id === i.departmentId)?.name}</p>}</div>
  },
  {
    key: 'cost',
    header: kind === 'asset' || kind === 'license' ? 'Total cost' : 'Unit cost',
    sort: (i) => i.cost ?? 0,
    render: (i) => <span className="whitespace-nowrap text-muted">{formatMoney(i.cost) || '-'}</span>
  },
  {
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    align: 'right',
    render: (i) =>
    <Menu
      label={`Actions for ${i.name}`}
      items={[
      { label: 'View details', onSelect: () => navigate(`/${kindPlural[kind].toLowerCase()}/${i.id}`) },
      { label: 'Assign', onSelect: () => setAssigning(i), disabled: itemCounts(db, i).available === 0, hint: 'Nothing available to assign' },
      { label: 'Edit', onSelect: () => setEditing(i) },
      { label: 'Delete', danger: true, onSelect: () => setDeleting(i) }]
      } />

  }];


  const exportCsv = () =>
  downloadCsv(`${kindPlural[kind].toLowerCase()}.csv`,
  ['Name', 'Tag', 'Serial / key', 'Status', 'Assigned to', 'Company'],
  rows.flatMap((i) => i.units.map((u) => {
    const a = db.assignments.find((x) => x.id === u.assignmentId);
    return [i.name, u.tag, u.serial ?? u.licenseKey, u.assignmentId ? 'Assigned' : u.statusLabelId ? db.statusLabels.find((s) => s.id === u.statusLabelId)?.name : u.state,
    a ? a.toEmployeeId ? db.employees.find((e) => e.id === a.toEmployeeId)?.name : 'Asset' : '', db.companies.find((c) => c.id === i.companyId)?.name];
  })));


  const base = `/${kindPlural[kind].toLowerCase()}`;
  return (
    <>
      <PageHeader
        title={kindPlural[kind]}
        subtitle={descriptions[kind]}
        actions={
        <>
            <Button onClick={exportCsv} disabled={rows.length === 0}><DownloadIcon className="h-4 w-4" />Export CSV</Button>
            <Button variant="primary" onClick={() => setCreating(true)}><PlusIcon className="h-4 w-4" />Add {kindLabel[kind].toLowerCase()}</Button>
          </>
        } />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SearchInput className="w-full sm:w-72" value={q} onChange={setQ} placeholder={`Search by name, tag or serial`} />
          <Select className="w-full sm:w-52" aria-label="Filter by company" value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">All companies</option>
            {db.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select className="w-full sm:w-44" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {db.categories.filter((c) => !c.type || c.type === kind).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select className="w-full sm:w-44" aria-label="Filter by availability" value={availability} onChange={(e) => setAvailability(e.target.value)}>
            <option value="">Any availability</option>
            <option value="available">Has available</option>
            <option value="none">None available</option>
            <option value="low">Low stock</option>
          </Select>
          {(q || company || category || availability) &&
          <Button variant="ghost" onClick={() => {setQ('');setCompany('');setCategory('');setAvailability('');}}>Clear filters</Button>
          }
          <span className="ml-auto text-[12px] text-muted">{rows.length} of {all.length}</span>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(i) => i.id}
          onRowClick={(i) => navigate(`${base}/${i.id}`)}
          emptyTitle={all.length === 0 ? `No ${kindPlural[kind].toLowerCase()} yet` : 'No matches'}
          emptyDescription={all.length === 0 ? `Add your first ${kindLabel[kind].toLowerCase()} to start tracking it.` : 'Try a different search or clear the filters.'}
          emptyAction={all.length === 0 ? <Button variant="primary" onClick={() => setCreating(true)}>Add {kindLabel[kind].toLowerCase()}</Button> : undefined} />
      </PageBody>

      <ItemFormDrawer kind={kind} open={creating} onClose={() => setCreating(false)} onSaved={(id) => navigate(`${base}/${id}`)} />
      {editing && <ItemFormDrawer kind={kind} item={editing} open onClose={() => setEditing(undefined)} />}
      {assigning && <AssignDrawer open item={assigning} onClose={() => setAssigning(undefined)} />}
      <Dialog
        open={Boolean(deleting)}
        busy={busy}
        title={`Delete ${deleting?.name}?`}
        body="This permanently removes the record, all of its individual items, and their history. Records with active assignments cannot be deleted."
        confirmLabel="Delete"
        confirmVariant="danger"
        onCancel={() => setDeleting(undefined)}
        onConfirm={async () => {
          const target = deleting!;
          await run((d) => deleteItem(d, target.id), `${target.name} deleted`);
          setDeleting(undefined);
        }} />
    </>);

}
