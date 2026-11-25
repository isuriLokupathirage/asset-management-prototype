import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileTextIcon, UsersIcon } from 'lucide-react';
import { CURRENT_USER_ID, KINDS, kindLabel, kindPlural, unitLabel, type Assignment, type Item, type Kind } from '../types';
import { useStore } from '../store/AppStore';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { Select } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/ui/DataTable';
import { TableToolbar } from '../components/ui/TableToolbar';
import { Avatar, Detail } from '../components/ui/Tabs';
import { Menu } from '../components/ui/Menu';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { AssignDrawer, HandoverDrawer, ReturnDrawer } from '../components/inventory/ActionDrawers';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { FormDrawer, Labeled } from '../components/ui/FormDrawer';
import { employeeAssignments } from '../utils/selectors';
import { findItem, itemCounts } from '../services/domain';
import { downloadExcel, formatDateTime } from '../utils/format';

/** All people with the number of items each currently holds. */
export function UserAssignments() {
  const { db } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [dep, setDep] = useState('');
  const [holding, setHolding] = useState('');

  const rows = useMemo(() => db.employees.map((e) => ({ e, ...employeeAssignments(db, e.id) })).filter(({ e, current }) => {
    if (dep && e.departmentId !== dep) return false;
    if (holding === 'yes' && current.length === 0) return false;
    if (holding === 'no' && current.length > 0) return false;
    const n = q.trim().toLowerCase();
    return !n || `${e.name} ${e.email} ${e.position}`.toLowerCase().includes(n);
  }), [db, q, dep, holding]);
  type Row = (typeof rows)[number];
  const depName = (r: Row) => db.departments.find((d) => d.id === r.e.departmentId)?.name ?? '';

  const cols: Column<Row>[] = [
  {
    key: 'name',
    header: 'User',
    sort: (r) => r.e.name,
    filter: 'text',
    filterLabel: 'name',
    render: (r) =>
    <div className="flex items-center gap-3">
          <Avatar name={r.e.name} />
          <div className="leading-tight"><p className="font-medium text-ink">{r.e.name}</p><p className="text-[11px] text-muted">{r.e.email}</p></div>
        </div>

  },
  { key: 'pos', header: 'Position', sort: (r) => r.e.position, filter: 'select', filterValue: (r) => r.e.position, render: (r) => r.e.position },
  { key: 'dep', header: 'Department', sort: depName, filter: 'select', filterValue: depName, render: (r) => <span className="text-muted">{depName(r)}</span> },
  ...KINDS.map((k) => ({ key: k, header: kindPlural[k], sort: (r: Row) => r.byKind[k], render: (r: Row) => <span className={r.byKind[k] ? 'font-medium text-ink' : 'text-subtle'}>{r.byKind[k]}</span> })),
  { key: 'total', header: 'Total', sort: (r) => r.current.length, render: (r) => <Badge className={r.current.length ? 'bg-amber-50 text-amber-800 ring-amber-200' : undefined}>{r.current.length}</Badge> }];


  return (
    <>
      <PageHeader title="Assignments Management" icon={UsersIcon} subtitle="See what each person currently holds, assign new items and process returns" />
      <PageBody>
        <DataTable
          columns={cols}
          rows={rows}
          rowKey={(r) => r.e.id}
          columnsMenu
          onRowClick={(r) => navigate(`/assignments/${r.e.id}`)}
          toolbar={({ rows: shown }) =>
          <TableToolbar
            search={q}
            onSearch={setQ}
            placeholder="Search users..."
            selectedCount={0}
            onExport={() => downloadExcel('user-assignments.xls', ['User', 'Email', 'Position', 'Department', ...KINDS.map((k) => kindPlural[k])], shown.map((r) => [r.e.name, r.e.email, r.e.position, depName(r), ...KINDS.map((k) => r.byKind[k])]))}>
              <Select className="h-9 w-44 text-[13px]" aria-label="Filter by department" value={dep} onChange={(e) => setDep(e.target.value)}>
                <option value="">All departments</option>
                {db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
              <Select className="h-9 w-40 text-[13px]" aria-label="Filter by holdings" value={holding} onChange={(e) => setHolding(e.target.value)}>
                <option value="">Anyone</option>
                <option value="yes">Holding items</option>
                <option value="no">Holding nothing</option>
              </Select>
            </TableToolbar>
          }
          emptyTitle="No users match"
          emptyDescription="Try another search or clear the filters." />
      </PageBody>
    </>);

}

/** Quick picker used from a user's page: choose a kind and record, then continue in the assign drawer. */
function PickItemDrawer({ open, onClose, onPick }: {open: boolean;onClose: () => void;onPick: (item: Item) => void;}) {
  const { db } = useStore();
  const [kind, setKind] = useState<Kind>('asset');
  const [itemId, setItemId] = useState('');
  const options = db.items.filter((i) => i.kind === kind && itemCounts(db, i).available > 0);
  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Assign an item"
      subtitle="Choose what to assign"
      submitLabel="Continue"
      onSubmit={() => {
        const it = findItem(db, itemId);
        if (it) {onPick(it);setItemId('');}
      }}>
      <div className="space-y-5">
        <Labeled label="Type">
          <Select value={kind} onChange={(e) => {setKind(e.target.value as Kind);setItemId('');}}>
            {KINDS.map((k) => <option key={k} value={k}>{kindPlural[k]}</option>)}
          </Select>
        </Labeled>
        <Labeled label={kindLabel[kind]} required hint={`${options.length} with items available`}>
          <SearchableSelect value={itemId} onChange={setItemId} placeholder={`Select ${kindLabel[kind].toLowerCase()}`} options={options.map((i) => ({ value: i.id, label: i.name, hint: `${itemCounts(db, i).available} available` }))} />
        </Labeled>
      </div>
    </FormDrawer>);

}

type TabId = 'details' | Kind | 'returned';

/** One person's details, current items by kind, and history. Also used for "My Assignments". */
export function UserAssignmentDetail({ self }: {self?: boolean;}) {
  const params = useParams();
  const { db } = useStore();
  const id = self ? CURRENT_USER_ID : params.userId;
  const emp = db.employees.find((e) => e.id === id);
  const [tab, setTab] = useState<TabId>('details');
  const [q, setQ] = useState('');
  const [picking, setPicking] = useState(false);
  const [assigning, setAssigning] = useState<Item>();
  const [returning, setReturning] = useState<string>();
  const [handover, setHandover] = useState<string[]>();
  const [selected, setSelected] = useState<Assignment[]>([]);

  if (!emp) {
    return (
      <>
        <PageHeader title="User not found" backTo="/assignments" backLabel="Assignments" />
        <PageBody><EmptyState icon={UsersIcon} title="This user does not exist" /></PageBody>
      </>);

  }

  const { current, history, byKind } = employeeAssignments(db, emp.id);
  const kindTab = KINDS.includes(tab as Kind) ? tab as Kind : undefined;
  const source = tab === 'returned' ? history : current.filter((a) => a.kind === kindTab);
  const n = q.trim().toLowerCase();
  const list = source.filter((a) => {
    if (!n) return true;
    const it = findItem(db, a.itemId);
    const u = it?.units.find((x) => x.id === a.unitId);
    return `${it?.name} ${u?.tag} ${u?.serial} ${u?.licenseKey} ${a.notes}`.toLowerCase().includes(n);
  });

  const itemOf = (a: Assignment) => findItem(db, a.itemId);
  const unitOf = (a: Assignment) => itemOf(a)?.units.find((u) => u.id === a.unitId);

  const cols: Column<Assignment>[] = [
  ...(tab === 'returned' ? [{ key: 'kind', header: 'Type', sort: (a: Assignment) => a.kind, render: (a: Assignment) => <Badge>{kindLabel[a.kind]}</Badge> }] : []),
  {
    key: 'item',
    header: `${kindTab ? kindLabel[kindTab] : 'Item'} Name`,
    title: 'Name',
    sort: (a) => itemOf(a)?.name ?? '',
    filter: 'text',
    filterLabel: 'name',
    filterValue: (a) => itemOf(a)?.name ?? '',
    render: (a) => <Link to={`/${kindPlural[a.kind].toLowerCase()}/${a.itemId}`} className="font-medium text-ink hover:text-brand-600">{itemOf(a)?.name}</Link>
  },
  { key: 'tag', header: kindTab === 'asset' ? 'Asset Tag' : 'Tag', title: 'Tag', sort: (a) => unitOf(a)?.tag ?? '', filter: 'text', filterLabel: 'tag', filterValue: (a) => unitOf(a)?.tag ?? '', render: (a) => unitOf(a)?.tag },
  { key: 'serial', header: kindTab === 'license' ? 'License Key' : 'Serial Number', title: 'Serial / key', render: (a) => <span className="font-mono text-[12px] text-muted">{unitOf(a)?.serial ?? unitOf(a)?.licenseKey ?? '-'}</span> },
  { key: 'admin', header: 'Notes for Admin', defaultHidden: self, render: (a) => <span className="line-clamp-2 max-w-[200px] text-muted">{unitOf(a)?.internalNotes || unitOf(a)?.notes || '-'}</span> },
  { key: 'at', header: 'Assigned At', sort: (a) => a.assignedAt, render: (a) => <span className="whitespace-nowrap">{formatDateTime(a.assignedAt)}</span> },
  ...(tab === 'returned' ? [{ key: 'ret', header: 'Returned At', sort: (a: Assignment) => a.returnedAt ?? '', render: (a: Assignment) => <span className="whitespace-nowrap">{formatDateTime(a.returnedAt)}</span> }, { key: 'cond', header: 'Condition', render: (a: Assignment) => a.condition }] : []),
  { key: 'notes', header: tab === 'returned' ? 'Return Notes' : 'Assignment Notes', render: (a) => <span className="line-clamp-2 max-w-[220px] text-muted">{(tab === 'returned' ? a.returnNotes : a.notes) || '-'}</span> },
  {
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    align: 'right',
    render: (a) =>
    <Menu items={[
    ...(!self && tab !== 'returned' ? [{ label: 'Return', onSelect: () => setReturning(a.id) }] : []),
    { label: tab === 'returned' ? 'Return form' : 'Handover form', onSelect: () => setHandover([a.id]) }]
    } />

  }];


  const tabs: {id: TabId;label: string;count?: number;}[] = [
  { id: 'details', label: 'User Details' },
  ...KINDS.map((k) => ({ id: k as TabId, label: kindPlural[k], count: byKind[k] })),
  { id: 'returned', label: 'Returned', count: history.length }];


  const handoverTargets = () => selected.length ? selected : current;

  return (
    <>
      <PageHeader
        title={self ? 'My Assignments' : `Assignments for ${emp.name}`}
        subtitle="View all assigned assets, licenses, components, and accessories"
        backTo={self ? undefined : '/assignments'}
        backLabel="Assignments"
        actions={
        <>
            {!self && <Button onClick={() => setPicking(true)}>Assign item</Button>}
            <Button variant="primary" disabled={current.length === 0} onClick={() => setHandover(handoverTargets().map((a) => a.id))}>
              <FileTextIcon className="h-4 w-4" />Generate Handover Form{selected.length ? ` (${selected.length})` : ''}
            </Button>
          </>
        } />
      <PageBody>
        <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto overflow-y-hidden rounded-xl bg-slate-200/60 p-1">
          {tabs.map((t) =>
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => {setTab(t.id);setQ('');setSelected([]);}}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${tab === t.id ? 'bg-white text-ink shadow-card' : 'text-muted hover:text-ink'}`}>
              {t.label}
              {t.count !== undefined && <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-800">{t.count}</span>}
            </button>
          )}
        </div>

        {tab === 'details' ?
        <section className="rounded-xl border border-line bg-white p-6 shadow-card">
            <h2 className="mb-6 flex items-center gap-2 text-sm font-semibold text-ink"><UsersIcon className="h-4 w-4" />User Information</h2>
            <div className="flex flex-col items-center text-center">
              <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-3xl font-semibold text-white">{emp.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
              <p className="mt-3 text-xl font-bold text-ink">{emp.name}</p>
              <p className="text-[13px] text-muted">{emp.position}</p>
            </div>
            <dl className="mx-auto mt-8 grid max-w-3xl gap-5 sm:grid-cols-2">
              <Detail label="Email">{emp.email}</Detail>
              <Detail label="Department">{db.departments.find((d) => d.id === emp.departmentId)?.name}</Detail>
              <Detail label="Company">{db.companies.find((c) => c.id === emp.companyId)?.name}</Detail>
              <Detail label="Branch">{emp.branch}</Detail>
              <Detail label="Items currently assigned">{current.length}</Detail>
              <Detail label="Items returned">{history.length}</Detail>
            </dl>
          </section> :

        <DataTable
          columns={cols}
          rows={list}
          rowKey={(a) => a.id}
          selectable={tab !== 'returned'}
          columnsMenu
          pageSize={8}
          onSelectionChange={setSelected}
          toolbar={({ rows: shown }) =>
          <TableToolbar
            search={q}
            onSearch={setQ}
            placeholder={`Search ${tab === 'returned' ? 'returned items' : kindPlural[kindTab!].toLowerCase()}...`}
            selectedCount={0}
            onExport={() => downloadExcel(`${emp.name.replace(/\s+/g, '-').toLowerCase()}-${tab}.xls`, ['Type', 'Name', 'Tag', 'Serial / key', 'Assigned at', 'Notes'], shown.map((a) => [kindLabel[a.kind], itemOf(a)?.name, unitOf(a)?.tag, unitOf(a)?.serial ?? unitOf(a)?.licenseKey, formatDateTime(a.assignedAt), a.notes]))}
            exportDisabled={shown.length === 0} />
          }
          emptyTitle={tab === 'returned' ? 'No returned items' : `No ${kindPlural[kindTab!].toLowerCase()} assigned`}
          emptyDescription={tab === 'returned' ? 'Items returned by this person appear here.' : `${unitLabel[kindTab!]}s assigned to this person appear here.`} />
        }
      </PageBody>
      <PickItemDrawer open={picking} onClose={() => setPicking(false)} onPick={(it) => {setPicking(false);setAssigning(it);}} />
      {assigning && <AssignDrawer open item={assigning} employeeId={emp.id} onClose={() => setAssigning(undefined)} />}
      <ReturnDrawer open={Boolean(returning)} assignmentId={returning} onClose={() => setReturning(undefined)} />
      <HandoverDrawer open={Boolean(handover)} assignmentIds={handover} onClose={() => setHandover(undefined)} />
    </>);

}
