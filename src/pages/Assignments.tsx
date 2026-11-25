import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { UsersIcon } from 'lucide-react';
import { CURRENT_USER_ID, KINDS, kindLabel, kindPlural, type Assignment, type Item, type Kind } from '../types';
import { useStore } from '../store/AppStore';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Avatar, Card, Detail, Tabs } from '../components/ui/Tabs';
import { Menu } from '../components/ui/Menu';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { AssignDrawer, HandoverDrawer, ReturnDrawer } from '../components/inventory/ActionDrawers';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { FormDrawer, Labeled } from '../components/ui/FormDrawer';
import { employeeAssignments } from '../utils/selectors';
import { findItem, itemCounts } from '../services/domain';
import { formatDate } from '../utils/format';

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

  const cols: Column<(typeof rows)[number]>[] = [
  {
    key: 'name',
    header: 'User',
    sort: (r) => r.e.name,
    render: (r) =>
    <div className="flex items-center gap-3">
          <Avatar name={r.e.name} />
          <div className="leading-tight"><p className="font-medium text-ink">{r.e.name}</p><p className="text-[11px] text-muted">{r.e.email}</p></div>
        </div>

  },
  { key: 'pos', header: 'Position', sort: (r) => r.e.position, render: (r) => r.e.position },
  { key: 'dep', header: 'Department', sort: (r) => db.departments.find((d) => d.id === r.e.departmentId)?.name ?? '', render: (r) => <span className="text-muted">{db.departments.find((d) => d.id === r.e.departmentId)?.name}</span> },
  ...KINDS.map((k) => ({ key: k, header: kindPlural[k], sort: (r: (typeof rows)[number]) => r.byKind[k], render: (r: (typeof rows)[number]) => <span className={r.byKind[k] ? 'font-medium text-ink' : 'text-subtle'}>{r.byKind[k]}</span> })),
  { key: 'total', header: 'Total', sort: (r) => r.current.length, render: (r) => <Badge className={r.current.length ? 'bg-sky-50 text-sky-700 ring-sky-200' : undefined}>{r.current.length}</Badge> }];


  return (
    <>
      <PageHeader title="User assignments" subtitle="See what each person currently holds, assign new items and process returns." />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SearchInput className="w-full sm:w-72" value={q} onChange={setQ} placeholder="Search by name, email or position" />
          <Select className="w-full sm:w-52" aria-label="Filter by department" value={dep} onChange={(e) => setDep(e.target.value)}>
            <option value="">All departments</option>
            {db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select className="w-full sm:w-48" aria-label="Filter by holdings" value={holding} onChange={(e) => setHolding(e.target.value)}>
            <option value="">Anyone</option>
            <option value="yes">Holding items</option>
            <option value="no">Holding nothing</option>
          </Select>
        </div>
        <DataTable columns={cols} rows={rows} rowKey={(r) => r.e.id} onRowClick={(r) => navigate(`/assignments/${r.e.id}`)} emptyTitle="No users match" emptyDescription="Try another search or clear the filters." />
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

/** One person's current items and history. Also used for "My Assignments". */
export function UserAssignmentDetail({ self }: {self?: boolean;}) {
  const params = useParams();
  const { db } = useStore();
  const id = self ? CURRENT_USER_ID : params.userId;
  const emp = db.employees.find((e) => e.id === id);
  const [tab, setTab] = useState<string>('current');
  const [kindFilter, setKindFilter] = useState<Kind | ''>('');
  const [picking, setPicking] = useState(false);
  const [assigning, setAssigning] = useState<Item>();
  const [returning, setReturning] = useState<string>();
  const [handover, setHandover] = useState<string>();

  if (!emp) {
    return (
      <>
        <PageHeader title="User not found" backTo="/assignments" backLabel="User assignments" />
        <PageBody><EmptyState icon={UsersIcon} title="This user does not exist" /></PageBody>
      </>);

  }

  const { current, history, byKind } = employeeAssignments(db, emp.id);
  const list = (tab === 'current' ? current : history).filter((a) => !kindFilter || a.kind === kindFilter);

  const cols: Column<Assignment>[] = [
  { key: 'kind', header: 'Type', sort: (a) => a.kind, render: (a) => <Badge>{kindLabel[a.kind]}</Badge> },
  {
    key: 'item',
    header: 'Item',
    sort: (a) => findItem(db, a.itemId)?.name ?? '',
    render: (a) => {
      const it = findItem(db, a.itemId);
      return <div><Link to={`/${kindPlural[a.kind].toLowerCase()}/${a.itemId}`} className="font-medium text-ink hover:text-brand-600">{it?.name}</Link><p className="text-[11px] text-muted">{it?.units.find((u) => u.id === a.unitId)?.tag}</p></div>;
    }
  },
  { key: 'at', header: 'Assigned', sort: (a) => a.assignedAt, render: (a) => formatDate(a.assignedAt) },
  ...(tab === 'history' ? [{ key: 'ret', header: 'Returned', sort: (a: Assignment) => a.returnedAt ?? '', render: (a: Assignment) => <span>{formatDate(a.returnedAt)} <span className="text-muted">· {a.condition}</span></span> }] : []),
  { key: 'notes', header: 'Notes', render: (a) => <span className="line-clamp-2 max-w-[240px] text-muted">{(tab === 'history' ? a.returnNotes : a.notes) || '-'}</span> },
  {
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    align: 'right',
    render: (a) =>
    <Menu items={[
    ...(!self && tab === 'current' ? [{ label: 'Return', onSelect: () => setReturning(a.id) }] : []),
    { label: tab === 'current' ? 'Handover form' : 'Return form', onSelect: () => setHandover(a.id) }]
    } />

  }];


  return (
    <>
      <PageHeader
        title={self ? 'My assignments' : emp.name}
        subtitle={self ? 'Items currently assigned to you, with their handover forms.' : `${emp.position}`}
        backTo={self ? undefined : '/assignments'}
        backLabel="User assignments"
        leading={<Avatar name={emp.name} size="lg" />}
        actions={!self ? <Button variant="primary" onClick={() => setPicking(true)}>Assign item</Button> : undefined} />
      <PageBody>
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <Card title="Profile">
            <dl className="space-y-4">
              <Detail label="Name">{emp.name}</Detail>
              <Detail label="Email">{emp.email}</Detail>
              <Detail label="Position">{emp.position}</Detail>
              <Detail label="Department">{db.departments.find((d) => d.id === emp.departmentId)?.name}</Detail>
              <Detail label="Company">{db.companies.find((c) => c.id === emp.companyId)?.name}</Detail>
              <Detail label="Branch">{emp.branch}</Detail>
            </dl>
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-line pt-4">
              {KINDS.map((k) =>
              <button key={k} type="button" onClick={() => {setKindFilter(kindFilter === k ? '' : k);setTab('current');}} className={`rounded-lg px-3 py-2 text-left transition-colors ${kindFilter === k ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-slate-50 hover:bg-slate-100'}`}>
                  <p className="text-lg font-semibold text-ink">{byKind[k]}</p>
                  <p className="text-[11px] text-muted">{kindPlural[k]}</p>
                </button>
              )}
            </div>
          </Card>
          <div>
            <Tabs tabs={[{ id: 'current', label: 'Currently assigned', count: current.length }, { id: 'history', label: 'Returned', count: history.length }]} active={tab} onChange={setTab} />
            {kindFilter && <p className="mt-3 text-[12px] text-muted">Showing {kindPlural[kindFilter].toLowerCase()} only. <button type="button" className="text-brand-600 hover:underline" onClick={() => setKindFilter('')}>Show all</button></p>}
            <div className="mt-4">
              <DataTable columns={cols} rows={list} rowKey={(a) => a.id} pageSize={8} emptyTitle={tab === 'current' ? 'Nothing assigned' : 'No returned items'} emptyDescription={tab === 'current' ? 'Items assigned to this person appear here.' : 'Returned items appear here.'} />
            </div>
          </div>
        </div>
      </PageBody>
      <PickItemDrawer open={picking} onClose={() => setPicking(false)} onPick={(it) => {setPicking(false);setAssigning(it);}} />
      {assigning && <AssignDrawer open item={assigning} employeeId={emp.id} onClose={() => setAssigning(undefined)} />}
      <ReturnDrawer open={Boolean(returning)} assignmentId={returning} onClose={() => setReturning(undefined)} />
      <HandoverDrawer open={Boolean(handover)} assignmentId={handover} onClose={() => setHandover(undefined)} />
    </>);

}
