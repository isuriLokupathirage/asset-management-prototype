import type { ReactNode } from 'react';
import type { Db, Kind } from '../../types';
import { DEPRECIATIONS, KINDS, STATUS_TYPES, kindLabel } from '../../types';
import type { Collection } from '../../services/domain';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import type { Tone } from '../../services/domain';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = any;

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'checks' | 'lines';
  options?: (db: Db) => {value: string;label: string;}[];
  required?: boolean;
  wide?: boolean;
  hint?: string;
  placeholder?: string;
  /** Hide the field depending on the form's current values. */
  when?: (form: Row) => boolean;
}

export interface ColumnDef {
  key: string;
  header: string;
  render: (r: Row, db: Db) => ReactNode;
  sort?: (r: Row, db: Db) => string | number;
}

export interface SettingConfig {
  collection: Collection;
  route: string;
  title: string;
  singular: string;
  description: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  blank: (db: Db) => Row;
  search: (r: Row, db: Db) => string;
  /** Extra text shown under the title column, e.g. in-use counts. */
  filters?: {key: string;label: string;options: (db: Db) => {value: string;label: string;}[];match: (r: Row, v: string) => boolean;}[];
}

const nameOf = <T extends {id: string;name: string;}>(list: T[], id?: string) => list.find((x) => x.id === id)?.name ?? '-';
const kindOptions = KINDS.map((k) => ({ value: k, label: kindLabel[k] }));
const statusTone: Record<string, Tone> = { Deployable: 'green', Pending: 'amber', 'Under Maintenance': 'violet', Undeployable: 'red', Retired: 'slate', Archived: 'slate' };

export const settingConfigs: SettingConfig[] = [
{
  collection: 'companies',
  route: 'companies',
  title: 'Companies',
  singular: 'company',
  description: 'Legal entities that own assets.',
  blank: () => ({ id: '', name: '', email: '', phone: '', note: '' }),
  search: (r) => `${r.name} ${r.email} ${r.phone}`,
  columns: [
  { key: 'name', header: 'Name', sort: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'email', header: 'Email', render: (r) => r.email || '-' },
  { key: 'phone', header: 'Phone', render: (r) => r.phone || '-' },
  { key: 'note', header: 'Note', render: (r) => <span className="text-muted">{r.note || '-'}</span> }],

  fields: [
  { key: 'name', label: 'Company name', type: 'text', required: true, wide: true },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'text', placeholder: '+94 11 000 0000' },
  { key: 'note', label: 'Note', type: 'textarea', wide: true }]

},
{
  collection: 'departments',
  route: 'departments',
  title: 'Departments',
  singular: 'department',
  description: 'Departments that hold or use assets.',
  blank: (db) => ({ id: '', name: '', companyId: db.companies[0]?.id ?? '', managerId: '', location: '', phone: '', note: '' }),
  search: (r, db) => `${r.name} ${r.location} ${nameOf(db.companies, r.companyId)}`,
  filters: [{ key: 'company', label: 'All companies', options: (db) => db.companies.map((c) => ({ value: c.id, label: c.name })), match: (r, v) => r.companyId === v }],
  columns: [
  { key: 'name', header: 'Name', sort: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'company', header: 'Company', sort: (r, db) => nameOf(db.companies, r.companyId), render: (r, db) => nameOf(db.companies, r.companyId) },
  { key: 'manager', header: 'Manager', render: (r, db) => r.managerId ? db.employees.find((e) => e.id === r.managerId)?.name : '-' },
  { key: 'location', header: 'Location', render: (r) => r.location || '-' },
  { key: 'phone', header: 'Phone', render: (r) => r.phone || '-' }],

  fields: [
  { key: 'name', label: 'Department name', type: 'text', required: true },
  { key: 'companyId', label: 'Company', type: 'select', required: true, options: (db) => db.companies.map((c) => ({ value: c.id, label: c.name })) },
  { key: 'managerId', label: 'Manager', type: 'select', options: (db) => db.employees.map((e) => ({ value: e.id, label: e.name })) },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'note', label: 'Note', type: 'textarea', wide: true }]

},
{
  collection: 'categories',
  route: 'categories',
  title: 'Categories',
  singular: 'category',
  description: 'Groups used to organise models and inventory.',
  blank: () => ({ id: '', name: '', type: '', note: '' }),
  search: (r) => `${r.name} ${r.note}`,
  filters: [{ key: 'type', label: 'All types', options: () => kindOptions, match: (r, v) => r.type === v }],
  columns: [
  { key: 'name', header: 'Name', sort: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'type', header: 'Applies to', sort: (r) => r.type ?? '', render: (r) => r.type ? <Badge>{kindLabel[r.type as Kind]}</Badge> : <span className="text-subtle">Any</span> },
  { key: 'note', header: 'Note', render: (r) => <span className="text-muted">{r.note || '-'}</span> }],

  fields: [
  { key: 'name', label: 'Category name', type: 'text', required: true },
  { key: 'type', label: 'Applies to', type: 'select', options: () => kindOptions, hint: 'Leave empty to allow any inventory type' },
  { key: 'note', label: 'Note', type: 'textarea', wide: true }]

},
{
  collection: 'manufacturers',
  route: 'manufacturers',
  title: 'Manufacturers',
  singular: 'manufacturer',
  description: 'Makers of the hardware and software you track.',
  blank: () => ({ id: '', name: '', note: '' }),
  search: (r) => `${r.name} ${r.note}`,
  columns: [
  { key: 'name', header: 'Name', sort: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'note', header: 'Note', render: (r) => <span className="text-muted">{r.note || '-'}</span> }],

  fields: [
  { key: 'name', label: 'Manufacturer name', type: 'text', required: true, wide: true },
  { key: 'note', label: 'Note', type: 'textarea', wide: true }]

},
{
  collection: 'suppliers',
  route: 'suppliers',
  title: 'Suppliers & repair agents',
  singular: 'supplier',
  description: 'Vendors that supply items, and agents that repair assets.',
  blank: () => ({ id: '', name: '', contactName: '', email: '', phone: '', webURL: '', address: '', city: '', state: '', postalCode: '', country: 'Sri Lanka', type: ['supplier'] }),
  search: (r) => `${r.name} ${r.contactName} ${r.email} ${r.city}`,
  filters: [{ key: 'type', label: 'All types', options: () => [{ value: 'supplier', label: 'Supplier' }, { value: 'repair agent', label: 'Repair agent' }], match: (r, v) => r.type.includes(v) }],
  columns: [
  { key: 'name', header: 'Name', sort: (r) => r.name, render: (r) => <div><p className="font-medium">{r.name}</p><p className="text-[11px] text-muted">{r.city}</p></div> },
  { key: 'type', header: 'Type', render: (r) => <span className="flex gap-1">{r.type.map((t: string) => <Badge key={t} className={t === 'repair agent' ? 'bg-violet-50 text-violet-700 ring-violet-200' : undefined}>{t === 'repair agent' ? 'Repair agent' : 'Supplier'}</Badge>)}</span> },
  { key: 'contact', header: 'Contact', render: (r) => <div><p>{r.contactName}</p><p className="text-[11px] text-muted">{r.email}</p></div> },
  { key: 'phone', header: 'Phone', render: (r) => r.phone || '-' }],

  fields: [
  { key: 'name', label: 'Name', type: 'text', required: true, wide: true },
  { key: 'type', label: 'Type', type: 'checks', required: true, wide: true, options: () => [{ value: 'supplier', label: 'Supplier' }, { value: 'repair agent', label: 'Repair agent' }] },
  { key: 'contactName', label: 'Contact name', type: 'text' },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'webURL', label: 'Website', type: 'text', placeholder: 'https://' },
  { key: 'address', label: 'Address', type: 'text', wide: true },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'state', label: 'State / province', type: 'text' },
  { key: 'postalCode', label: 'Postal code', type: 'text' },
  { key: 'country', label: 'Country', type: 'text' }]

},
{
  collection: 'models',
  route: 'asset-models',
  title: 'Asset models',
  singular: 'model',
  description: 'Hardware models. A model carries its category, manufacturer, depreciation and field set.',
  blank: (db) => ({ id: '', name: '', categoryId: db.categories[0]?.id ?? '', manufacturerId: db.manufacturers[0]?.id ?? '', modelNo: '', depreciation: 'Do Not Depreciate', minQty: 1, eol: '', fieldsetId: '', notes: '' }),
  search: (r, db) => `${r.name} ${r.modelNo} ${nameOf(db.manufacturers, r.manufacturerId)}`,
  filters: [{ key: 'category', label: 'All categories', options: (db) => db.categories.map((c) => ({ value: c.id, label: c.name })), match: (r, v) => r.categoryId === v }],
  columns: [
  { key: 'name', header: 'Model', sort: (r) => r.name, render: (r) => <div><p className="font-medium">{r.name}</p><p className="text-[11px] text-muted">{r.modelNo}</p></div> },
  { key: 'cat', header: 'Category', sort: (r, db) => nameOf(db.categories, r.categoryId), render: (r, db) => nameOf(db.categories, r.categoryId) },
  { key: 'man', header: 'Manufacturer', sort: (r, db) => nameOf(db.manufacturers, r.manufacturerId), render: (r, db) => nameOf(db.manufacturers, r.manufacturerId) },
  { key: 'dep', header: 'Depreciation', render: (r) => <span className="text-muted">{r.depreciation}</span> },
  { key: 'min', header: 'Min qty', sort: (r) => r.minQty, render: (r) => r.minQty },
  { key: 'eol', header: 'EOL', render: (r) => r.eol ? `${r.eol} months` : '-' },
  { key: 'fs', header: 'Field set', render: (r, db) => r.fieldsetId ? nameOf(db.fieldSets, r.fieldsetId) : '-' }],

  fields: [
  { key: 'name', label: 'Model name', type: 'text', required: true },
  { key: 'modelNo', label: 'Model number', type: 'text', required: true },
  { key: 'categoryId', label: 'Category', type: 'select', required: true, options: (db) => db.categories.map((c) => ({ value: c.id, label: c.name })) },
  { key: 'manufacturerId', label: 'Manufacturer', type: 'select', required: true, options: (db) => db.manufacturers.map((m) => ({ value: m.id, label: m.name })) },
  { key: 'depreciation', label: 'Depreciation', type: 'select', required: true, options: () => DEPRECIATIONS.map((d) => ({ value: d, label: d })) },
  { key: 'minQty', label: 'Minimum quantity', type: 'number' },
  { key: 'eol', label: 'End of life (months)', type: 'number', hint: 'Used as a guide for planning replacements' },
  { key: 'fieldsetId', label: 'Field set', type: 'select', options: (db) => db.fieldSets.map((f) => ({ value: f.id, label: f.name })), hint: 'Adds custom fields to every asset of this model' },
  { key: 'notes', label: 'Notes', type: 'textarea', wide: true }]

},
{
  collection: 'assetTypes',
  route: 'asset-types',
  title: 'Asset types',
  singular: 'asset type',
  description: 'Asset types define the tag pattern used when records are created, for example LAP-XXX.',
  blank: (db) => ({ id: '', name: '', pattern: '', kind: 'asset', companyId: db.companies[0]?.id ?? '', departmentId: '', notes: '' }),
  search: (r, db) => `${r.name} ${r.pattern} ${nameOf(db.companies, r.companyId)}`,
  filters: [{ key: 'kind', label: 'All kinds', options: () => kindOptions, match: (r, v) => r.kind === v }],
  columns: [
  { key: 'name', header: 'Name', sort: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'pattern', header: 'Tag pattern', sort: (r) => r.pattern, render: (r) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px]">{r.pattern}</code> },
  { key: 'example', header: 'Example', render: (r) => <span className="text-muted">{String(r.pattern).replace(/X+/i, (m) => '1'.padStart(m.length, '0'))}</span> },
  { key: 'kind', header: 'Kind', render: (r) => <Badge>{kindLabel[r.kind as Kind]}</Badge> },
  { key: 'company', header: 'Company', render: (r, db) => nameOf(db.companies, r.companyId) }],

  fields: [
  { key: 'name', label: 'Type name', type: 'text', required: true },
  { key: 'pattern', label: 'Tag pattern', type: 'text', required: true, placeholder: 'LAP-XXX', hint: 'Use XXX where the running number goes. Longer runs (XXXX) mean more digits.' },
  { key: 'kind', label: 'Kind', type: 'select', required: true, options: () => kindOptions },
  { key: 'companyId', label: 'Company', type: 'select', required: true, options: (db) => db.companies.map((c) => ({ value: c.id, label: c.name })) },
  { key: 'departmentId', label: 'Department', type: 'select', options: (db) => db.departments.map((d) => ({ value: d.id, label: d.name })) },
  { key: 'notes', label: 'Notes', type: 'textarea', wide: true }]

},
{
  collection: 'statusLabels',
  route: 'status-labels',
  title: 'Status labels',
  singular: 'status label',
  description: 'Labels for the state of an individual asset. Only Deployable assets can be assigned.',
  blank: () => ({ id: '', name: '', statusType: 'Deployable', note: '' }),
  search: (r) => `${r.name} ${r.statusType} ${r.note}`,
  filters: [{ key: 'type', label: 'All status types', options: () => STATUS_TYPES.map((s) => ({ value: s, label: s })), match: (r, v) => r.statusType === v }],
  columns: [
  { key: 'name', header: 'Label', sort: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'type', header: 'Status type', sort: (r) => r.statusType, render: (r) => <StatusBadge tone={statusTone[r.statusType]}>{r.statusType}</StatusBadge> },
  { key: 'use', header: 'In use', render: (r, db) => db.items.flatMap((i) => i.units).filter((u) => u.statusLabelId === r.id).length },
  { key: 'note', header: 'Note', render: (r) => <span className="text-muted">{r.note || '-'}</span> }],

  fields: [
  { key: 'name', label: 'Label name', type: 'text', required: true },
  { key: 'statusType', label: 'Status type', type: 'select', required: true, options: () => STATUS_TYPES.map((s) => ({ value: s, label: s })), hint: 'Deployable = can be assigned. Under Maintenance = with a repair agent.' },
  { key: 'note', label: 'Note', type: 'textarea', wide: true }]

},
{
  collection: 'customFields',
  route: 'custom-fields',
  title: 'Custom fields',
  singular: 'custom field',
  description: 'Extra fields captured on individual assets, grouped into field sets.',
  blank: () => ({ id: '', fieldName: '', formElement: 'text_box', format: 'any', fieldsetIds: [], options: [], required: false, displayInCheckout: false, displayInCheckin: false }),
  search: (r, db) => `${r.fieldName} ${r.fieldsetIds.map((id: string) => nameOf(db.fieldSets, id)).join(' ')}`,
  columns: [
  { key: 'name', header: 'Field', sort: (r) => r.fieldName, render: (r) => <span className="font-medium">{r.fieldName}</span> },
  { key: 'el', header: 'Input', render: (r) => <span className="capitalize text-muted">{String(r.formElement).replace('_', ' ')}</span> },
  { key: 'fmt', header: 'Format', render: (r) => <span className="text-muted">{String(r.format).replace('_', ' ')}</span> },
  { key: 'req', header: 'Required', render: (r) => r.required ? <Badge className="bg-amber-50 text-amber-800 ring-amber-200">Required</Badge> : '-' },
  { key: 'sets', header: 'Field sets', render: (r, db) => r.fieldsetIds.length ? <span className="flex flex-wrap gap-1">{r.fieldsetIds.map((id: string) => <Badge key={id}>{nameOf(db.fieldSets, id)}</Badge>)}</span> : <span className="text-subtle">None</span> }],

  fields: [
  { key: 'fieldName', label: 'Field name', type: 'text', required: true, wide: true },
  { key: 'formElement', label: 'Input type', type: 'select', required: true, options: () => [{ value: 'text_box', label: 'Text box' }, { value: 'text_area', label: 'Text area' }, { value: 'check_box', label: 'Check box' }, { value: 'radio_buttons', label: 'Radio buttons' }, { value: 'select', label: 'Dropdown' }] },
  { key: 'format', label: 'Format', type: 'select', required: true, options: () => ['any', 'alpha', 'alpha_numeric', 'numeric', 'email', 'date', 'url', 'ip', 'mac', 'boolean'].map((f) => ({ value: f, label: f.replace('_', ' ') })) },
  { key: 'options', label: 'Options', type: 'lines', wide: true, hint: 'One option per line', when: (f) => ['select', 'radio_buttons'].includes(f.formElement) },
  { key: 'fieldsetIds', label: 'Field sets', type: 'checks', wide: true, options: (db) => db.fieldSets.map((f) => ({ value: f.id, label: f.name })) },
  { key: 'required', label: 'Required when filling in an asset', type: 'checks', wide: true, options: () => [{ value: 'required', label: 'Required' }, { value: 'displayInCheckout', label: 'Show on checkout' }, { value: 'displayInCheckin', label: 'Show on check-in' }] }]

},
{
  collection: 'fieldSets',
  route: 'field-sets',
  title: 'Field sets',
  singular: 'field set',
  description: 'A field set groups custom fields. Link it to models to add its fields to their assets.',
  blank: () => ({ id: '', name: '' }),
  search: (r) => r.name,
  columns: [
  { key: 'name', header: 'Name', sort: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'fields', header: 'Custom fields', render: (r, db) => { const f = db.customFields.filter((c) => c.fieldsetIds.includes(r.id)); return f.length ? <span className="flex flex-wrap gap-1">{f.map((x) => <Badge key={x.id}>{x.fieldName}</Badge>)}</span> : <span className="text-subtle">None. Add fields on the Custom Fields page.</span>; } },
  { key: 'models', header: 'Models', render: (r, db) => db.models.filter((m) => m.fieldsetId === r.id).map((m) => m.name).join(', ') || '-' }],

  fields: [{ key: 'name', label: 'Field set name', type: 'text', required: true, wide: true }]
}];
