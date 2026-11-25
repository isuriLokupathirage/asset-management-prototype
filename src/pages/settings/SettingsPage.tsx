import { useEffect, useMemo, useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { deleteSetting, newId, saveSetting } from '../../services/domain';
import { PageBody, PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select, Input, Textarea, Checkbox } from '../../components/ui/Field';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Menu } from '../../components/ui/Menu';
import { Dialog } from '../../components/ui/Dialog';
import { FormDrawer, Labeled } from '../../components/ui/FormDrawer';
import type { FieldDef, Row, SettingConfig } from './settingsConfig';

function SettingForm({ config, record, onClose }: {config: SettingConfig;record: Row;onClose: () => void;}) {
  const { db, run, busy } = useStore();
  const isNew = !record.id;
  const [form, setForm] = useState<Row>(record);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {setForm(record);setErrors({});}, [record]);

  const set = (k: string, v: unknown) => setForm((f: Row) => ({ ...f, [k]: v }));
  const visible = config.fields.filter((f) => !f.when || f.when(form));

  const submit = async () => {
    const e: Record<string, string> = {};
    for (const f of visible) {
      const v = form[f.key];
      if (f.required && (v === undefined || v === '' || Array.isArray(v) && v.length === 0)) e[f.key] = `${f.label} is required`;
      if (f.type === 'email' && v && !/^\S+@\S+\.\S+$/.test(String(v))) e[f.key] = 'Enter a valid email address';
      if (f.type === 'number' && v !== '' && v !== undefined && Number(v) < 0) e[f.key] = 'Cannot be negative';
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    const clean: Row = { ...form };
    for (const f of config.fields) {
      if (f.type === 'number') clean[f.key] = clean[f.key] === '' || clean[f.key] === undefined ? undefined : Number(clean[f.key]);
      if (f.type === 'select' && clean[f.key] === '') clean[f.key] = undefined;
    }
    if (config.collection === 'models') clean.minQty = clean.minQty ?? 0;
    if (!clean.id) clean.id = newId(config.collection.slice(0, 3));
    const r = await run((d) => saveSetting(d, config.collection, clean), `${config.singular[0].toUpperCase()}${config.singular.slice(1)} ${isNew ? 'created' : 'updated'}`);
    if (r.ok) onClose();
  };

  const control = (f: FieldDef) => {
    const v = form[f.key];
    if (f.type === 'textarea') return <Textarea value={v ?? ''} onChange={(e) => set(f.key, e.target.value)} />;
    if (f.type === 'select') {
      return (
        <Select value={v ?? ''} onChange={(e) => set(f.key, e.target.value)}>
          <option value="">Select</option>
          {f.options?.(db).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>);

    }
    if (f.type === 'lines') return <Textarea value={(v ?? []).join('\n')} onChange={(e) => set(f.key, e.target.value.split('\n').map((s) => s.trimStart()).filter((s, i, a) => s !== '' || i < a.length - 1))} />;
    if (f.type === 'checks') {
      const opts = f.options?.(db) ?? [];
      // The custom-field flags are separate booleans rather than a list.
      const flags = f.key === 'required';
      return (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {opts.map((o) => {
            const checked = flags ? Boolean(form[o.value]) : (v ?? []).includes(o.value);
            return (
              <Checkbox
                key={o.value}
                label={o.label}
                checked={checked}
                onChange={(e) => flags ? set(o.value, e.target.checked) : set(f.key, e.target.checked ? [...(v ?? []), o.value] : (v ?? []).filter((x: string) => x !== o.value))} />);

          })}
          {opts.length === 0 && <p className="text-[13px] text-muted">None available yet.</p>}
        </div>);

    }
    return <Input type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'} value={v ?? ''} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />;
  };

  return (
    <FormDrawer open onClose={onClose} onSubmit={submit} busy={busy} title={`${isNew ? 'Add' : 'Edit'} ${config.singular}`} submitLabel={isNew ? 'Create' : 'Save changes'}>
      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((f) =>
        <Labeled key={f.key} label={f.label} required={f.required} error={errors[f.key]} hint={f.hint} wide={f.wide || f.type === 'textarea'}>
            {control(f)}
          </Labeled>
        )}
      </div>
    </FormDrawer>);

}

export function SettingsPage({ config }: {config: SettingConfig;}) {
  const { db, run, busy } = useStore();
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Row>();
  const [deleting, setDeleting] = useState<Row>();

  useEffect(() => {setQ('');setFilters({});}, [config.collection]);

  const all = db[config.collection] as Row[];
  const rows = useMemo(() => all.filter((r) => {
    for (const f of config.filters ?? []) {
      if (filters[f.key] && !f.match(r, filters[f.key])) return false;
    }
    const n = q.trim().toLowerCase();
    return !n || config.search(r, db).toLowerCase().includes(n);
  }), [all, q, filters, config, db]);

  const columns: Column<Row>[] = [
  ...config.columns.map((c) => ({ key: c.key, header: c.header, sort: c.sort ? (r: Row) => c.sort!(r, db) : undefined, render: (r: Row) => c.render(r, db) })),
  {
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    align: 'right',
    render: (r) => <Menu label="Row actions" items={[{ label: 'Edit', onSelect: () => setEditing(r) }, { label: 'Delete', danger: true, onSelect: () => setDeleting(r) }]} />
  }];


  return (
    <>
      <PageHeader
        title={config.title}
        subtitle={config.description}
        actions={<Button variant="primary" onClick={() => setEditing(config.blank(db))}><PlusIcon className="h-4 w-4" />Add {config.singular}</Button>} />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SearchInput className="w-full sm:w-72" value={q} onChange={setQ} placeholder={`Search ${config.title.toLowerCase()}`} />
          {(config.filters ?? []).map((f) =>
          <Select key={f.key} className="w-full sm:w-52" aria-label={f.label} value={filters[f.key] ?? ''} onChange={(e) => setFilters((x) => ({ ...x, [f.key]: e.target.value }))}>
              <option value="">{f.label}</option>
              {f.options(db).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          )}
          <span className="ml-auto text-[12px] text-muted">{rows.length} of {all.length}</span>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => setEditing(r)}
          emptyTitle={all.length ? 'No matches' : `No ${config.title.toLowerCase()} yet`}
          emptyDescription={all.length ? 'Try a different search or filter.' : `Add your first ${config.singular}.`}
          emptyAction={all.length ? undefined : <Button variant="primary" onClick={() => setEditing(config.blank(db))}>Add {config.singular}</Button>} />
      </PageBody>
      {editing && <SettingForm config={config} record={editing} onClose={() => setEditing(undefined)} />}
      <Dialog
        open={Boolean(deleting)}
        busy={busy}
        title={`Delete ${deleting?.name ?? deleting?.fieldName}?`}
        body={`This removes the ${config.singular}. It cannot be deleted while other records still use it.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onCancel={() => setDeleting(undefined)}
        onConfirm={async () => {
          const target = deleting;
          await run((d) => deleteSetting(d, config.collection, target.id), `${config.singular[0].toUpperCase()}${config.singular.slice(1)} deleted`);
          setDeleting(undefined);
        }} />
    </>);

}
