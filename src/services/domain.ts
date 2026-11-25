/**
 * Pure business operations over the demo database.
 * Each operation takes the current Db and returns a new Db, or throws a ServiceError.
 * The rules are taken from the legacy backend (Accxis360.Api/src/asset-management/services).
 * Replace the calls made by `store/AppStore.tsx` with real API calls to go live.
 */
import type {
  Assignment,
  Db,
  HistoryEvent,
  Item,
  Kind,
  Maintenance,
  MaintenanceStatus,
  ReturnCondition,
  StatusLabel,
  StatusType,
  Unit } from
'../types';
import { CURRENT_USER_ID, kindLabel } from '../types';

export class ServiceError extends Error {}

const fail = (message: string): never => {
  throw new ServiceError(message);
};

let counter = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;
const nowIso = () => new Date().toISOString();

export type UnitInput = Omit<Unit, 'id' | 'assignmentId'>;
export type ItemInput = Omit<Item, 'id' | 'kind' | 'units' | 'createdAt' | 'updatedAt'>;

// ---------------------------------------------------------------- lookups

export const findItem = (db: Db, id: string | undefined) => db.items.find((i) => i.id === id);
export const findUnit = (item: Item | undefined, unitId: string | undefined) => item?.units.find((u) => u.id === unitId);
export const employeeName = (db: Db, id?: string) => db.employees.find((e) => e.id === id)?.name ?? 'Unknown user';
export const statusLabelOf = (db: Db, unit: Unit): StatusLabel | undefined => db.statusLabels.find((s) => s.id === unit.statusLabelId);

export type Tone = 'green' | 'blue' | 'amber' | 'red' | 'slate' | 'violet';

export interface UnitStatus {
  name: string;
  tone: Tone;
  assigned: boolean;
  /** Can be assigned right now. */
  available: boolean;
}

const statusTypeTone: Record<StatusType, Tone> = {
  Deployable: 'green',
  Pending: 'amber',
  'Under Maintenance': 'violet',
  Undeployable: 'red',
  Retired: 'slate',
  Archived: 'slate'
};

export function unitStatus(db: Db, item: Item, unit: Unit): UnitStatus {
  const assigned = Boolean(unit.assignmentId);
  if (item.kind === 'asset') {
    const label = statusLabelOf(db, unit);
    const type = label?.statusType;
    return {
      name: label?.name ?? 'Unknown',
      tone: statusTypeTone[type ?? 'Archived'],
      assigned,
      available: type === 'Deployable' && !assigned
    };
  }
  const map: Record<string, {name: string;tone: Tone;}> = {
    available: { name: 'Available', tone: 'green' },
    assigned: { name: 'Assigned', tone: 'blue' },
    activated: { name: 'Activated', tone: 'blue' },
    maintenance: { name: 'Maintenance', tone: 'violet' },
    retired: { name: 'Retired', tone: 'slate' },
    expired: { name: 'Expired', tone: 'red' }
  };
  const s = map[unit.state];
  return { name: s.name, tone: s.tone, assigned, available: unit.state === 'available' && !assigned };
}

export const itemCounts = (db: Db, item: Item) => {
  const statuses = item.units.map((u) => unitStatus(db, item, u));
  return {
    total: item.units.length,
    available: statuses.filter((s) => s.available).length,
    assigned: statuses.filter((s) => s.assigned).length
  };
};

export const currentAssignmentOf = (db: Db, unit: Unit) => db.assignments.find((a) => a.id === unit.assignmentId);

export function assigneeLabel(db: Db, a: Assignment): string {
  if (a.toEmployeeId) return employeeName(db, a.toEmployeeId);
  const parent = findItem(db, a.toItemId);
  const parentUnit = findUnit(parent, a.toUnitId);
  return parent ? `${parentUnit?.tag ?? ''} · ${parent.name}`.replace(/^ · /, '') : 'Unknown asset';
}

// ---------------------------------------------------------------- tags

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Pattern like "LAP-XXX": the last run of X is the zero-padded sequence number. */
function splitPattern(pattern: string) {
  const idx = pattern.toUpperCase().lastIndexOf('XXX');
  if (idx === -1) return null;
  const run = /X+/i.exec(pattern.substring(idx))![0];
  return { prefix: pattern.substring(0, idx), suffix: pattern.substring(idx + run.length), pad: run.length };
}

export const patternIsValid = (pattern: string) => /XXX/i.test(pattern);

export function tagMatchesPattern(pattern: string, tag: string): boolean {
  const p = splitPattern(pattern);
  if (!p) return pattern.toUpperCase() === tag.toUpperCase();
  return new RegExp(`^${escapeRe(p.prefix)}(\\d{${p.pad},})${escapeRe(p.suffix)}$`, 'i').test(tag);
}

/** Next free tags for a type, skipping every tag already in use anywhere and any extra excluded tags. */
export function generateTags(db: Db, assetTypeId: string | undefined, count: number, exclude: string[] = []): string[] {
  const used = new Set<string>([...db.items.flatMap((i) => i.units.map((u) => u.tag)), ...exclude].map((t) => t.toUpperCase()));
  const type = db.assetTypes.find((t) => t.id === assetTypeId);
  const p = type ? splitPattern(type.pattern) : null;
  const out: string[] = [];
  let n = 1;
  while (out.length < count && n < 100000) {
    const tag = p ? `${p.prefix}${String(n).padStart(p.pad, '0')}${p.suffix}` : `AST-${String(n).padStart(4, '0')}`;
    if (!used.has(tag.toUpperCase())) {
      out.push(tag);
      used.add(tag.toUpperCase());
    }
    n++;
  }
  return out;
}

// ---------------------------------------------------------------- history

function log(db: Db, kind: Kind, itemId: string, unitId: string | undefined, action: string, detail?: string): HistoryEvent[] {
  const ev: HistoryEvent = { id: newId('h'), at: nowIso(), by: CURRENT_USER_ID, kind, itemId, unitId, action, detail };
  return [ev, ...db.history];
}

const touch = (item: Item): Item => ({ ...item, updatedAt: nowIso() });
const replaceItem = (db: Db, item: Item): Db => ({ ...db, items: db.items.map((i) => i.id === item.id ? item : i) });

// ---------------------------------------------------------------- items

function validateItem(db: Db, kind: Kind, input: ItemInput, selfId?: string) {
  const label = kindLabel[kind];
  if (!input.name.trim()) fail(`${label} name is required`);
  if (!input.companyId) fail('Company is required');
  if (kind === 'asset') {
    if (!input.modelId) fail('Model is required');
    if (!input.departmentId) fail('Department is required');
  }
  if (input.minQty < 0 || Number.isNaN(input.minQty)) fail('Minimum quantity cannot be negative');
  if (input.cost !== undefined && input.cost < 0) fail('Cost cannot be negative');
  if (db.items.some((i) => i.kind === kind && i.id !== selfId && i.name.trim().toLowerCase() === input.name.trim().toLowerCase())) {
    fail(`A ${label.toLowerCase()} named "${input.name.trim()}" already exists`);
  }
  if (input.assetTypeId) {
    const type = db.assetTypes.find((t) => t.id === input.assetTypeId);
    if (!type) fail('Asset type not found');
    else if (type.companyId !== input.companyId) fail('Asset type does not belong to the selected company');
  }
  if (input.departmentId) {
    const dep = db.departments.find((d) => d.id === input.departmentId);
    if (dep && dep.companyId !== input.companyId) fail('Department does not belong to the selected company');
  }
  if (kind === 'license' && input.licensedToEmail && !/^\S+@\S+\.\S+$/.test(input.licensedToEmail)) fail('Licensed-to email is not valid');
}

function validateUnits(db: Db, kind: Kind, item: {assetTypeId?: string;}, units: Array<UnitInput & {id?: string;}>, skipItemId?: string) {
  if (units.length === 0) fail(`Add at least one ${kind === 'license' ? 'seat' : 'individual item'}`);
  const type = db.assetTypes.find((t) => t.id === item.assetTypeId);
  const otherUnits = db.items.filter((i) => i.id !== skipItemId).flatMap((i) => i.units.map((u) => ({ u, kind: i.kind })));
  const tags = new Set<string>();
  const serials = new Set<string>();
  const keys = new Set<string>();
  for (const unit of units) {
    const tag = unit.tag.trim();
    if (!tag) fail('Every record needs a tag');
    if (tags.has(tag.toLowerCase())) fail(`Duplicate tag "${tag}" in this form`);
    tags.add(tag.toLowerCase());
    if (otherUnits.some((o) => o.u.tag.toLowerCase() === tag.toLowerCase() && o.u.id !== unit.id)) fail(`Tag "${tag}" already exists`);
    if (type && !tagMatchesPattern(type.pattern, tag)) fail(`Tag "${tag}" does not match the pattern "${type.pattern}"`);
    const serial = unit.serial?.trim().toLowerCase();
    if (serial) {
      if (serials.has(serial)) fail(`Duplicate serial number "${unit.serial}" in this form`);
      serials.add(serial);
      if (otherUnits.some((o) => o.kind === kind && o.u.serial?.toLowerCase() === serial && o.u.id !== unit.id)) fail(`Serial number "${unit.serial}" already exists`);
    }
    if (kind === 'asset' && !unit.statusLabelId) fail(`Select a status for ${tag}`);
    if (kind === 'license') {
      const key = unit.licenseKey?.trim().toLowerCase();
      if (!key) fail(`Seat ${tag} needs a license key`);
      else if (keys.has(key)) fail(`Duplicate license key in this form`);
      else keys.add(key);
    }
  }
}

export function createItem(db: Db, kind: Kind, input: ItemInput, units: UnitInput[]): {db: Db;item: Item;} {
  validateItem(db, kind, input);
  validateUnits(db, kind, input, units);
  const item: Item = {
    ...input,
    id: newId(kind.slice(0, 3)),
    kind,
    name: input.name.trim(),
    units: units.map((u) => ({ ...u, id: newId('u'), tag: u.tag.trim() })),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  return {
    item,
    db: {
      ...db,
      items: [item, ...db.items],
      history: log(db, kind, item.id, undefined, 'Registered', `${item.units.length} ${item.units.length === 1 ? 'record' : 'records'} added`)
    }
  };
}

export function updateItem(db: Db, id: string, input: ItemInput): Db {
  const item = findItem(db, id) ?? fail('Record not found');
  const existing = item as Item;
  validateItem(db, existing.kind, input, id);
  if (input.assetTypeId) {
    const type = db.assetTypes.find((t) => t.id === input.assetTypeId)!;
    const bad = existing.units.find((u) => !tagMatchesPattern(type.pattern, u.tag));
    if (bad) fail(`Existing tag "${bad.tag}" does not match the pattern "${type.pattern}" of the selected type`);
  }
  const next = touch({ ...existing, ...input, name: input.name.trim() });
  return { ...replaceItem(db, next), history: log(db, existing.kind, id, undefined, 'Updated', 'Details edited') };
}

export function deleteItem(db: Db, id: string): Db {
  const item = findItem(db, id) ?? fail('Record not found');
  const it = item as Item;
  const assigned = it.units.filter((u) => u.assignmentId);
  if (assigned.length) {
    fail(`Cannot delete ${it.name} because items are still assigned: ${assigned.slice(0, 5).map((u) => u.tag).join(', ')}${assigned.length > 5 ? ` and ${assigned.length - 5} more` : ''}`);
  }
  if (it.kind === 'asset') {
    const children = db.assignments.filter((a) => !a.returnedAt && a.toItemId === id);
    if (children.length) fail(`Cannot delete ${it.name} because ${children.length} item(s) are assigned to it`);
  }
  return {
    ...db,
    items: db.items.filter((i) => i.id !== id),
    assignments: db.assignments.filter((a) => a.itemId !== id),
    maintenance: db.maintenance.filter((m) => m.itemId !== id),
    history: db.history.filter((h) => h.itemId !== id)
  };
}

// ---------------------------------------------------------------- units

export function addUnits(db: Db, itemId: string, units: UnitInput[]): Db {
  const item = (findItem(db, itemId) ?? fail('Record not found')) as Item;
  const all = [...item.units, ...units.map((u) => ({ ...u, id: '' }))];
  validateUnits(db, item.kind, item, all.map((u, i) => i < item.units.length ? { ...u } : u), itemId);
  const created = units.map((u) => ({ ...u, id: newId('u'), tag: u.tag.trim() }));
  return {
    ...replaceItem(db, touch({ ...item, units: [...item.units, ...created] })),
    history: log(db, item.kind, itemId, undefined, 'Records added', created.map((u) => u.tag).join(', '))
  };
}

export function updateUnit(db: Db, itemId: string, unitId: string, patch: UnitInput): Db {
  const item = (findItem(db, itemId) ?? fail('Record not found')) as Item;
  const unit = (findUnit(item, unitId) ?? fail('Individual record not found')) as Unit;
  const merged: Unit = { ...unit, ...patch, id: unit.id, assignmentId: unit.assignmentId };
  // Status of an asset is changed through changeAssetStatus; keep it here.
  if (item.kind === 'asset') merged.statusLabelId = unit.statusLabelId;
  // The state of a unit that is assigned is owned by the assignment.
  if (unit.assignmentId) merged.state = unit.state;
  const others = item.units.filter((u) => u.id !== unitId);
  validateUnits(db, item.kind, item, [...others, merged].map((u) => ({ ...u })), itemId);
  return {
    ...replaceItem(db, touch({ ...item, units: item.units.map((u) => u.id === unitId ? merged : u) })),
    history: log(db, item.kind, itemId, unitId, 'Updated', `${merged.tag} edited`)
  };
}

export function deleteUnit(db: Db, itemId: string, unitId: string): Db {
  const item = (findItem(db, itemId) ?? fail('Record not found')) as Item;
  const unit = (findUnit(item, unitId) ?? fail('Individual record not found')) as Unit;
  if (unit.assignmentId) fail('Cannot delete an assigned item. Please return it first.');
  if (item.units.length === 1) fail('A record needs at least one individual item. Delete the whole record instead.');
  return {
    ...replaceItem(db, touch({ ...item, units: item.units.filter((u) => u.id !== unitId) })),
    assignments: db.assignments.filter((a) => a.unitId !== unitId),
    maintenance: db.maintenance.filter((m) => m.unitId !== unitId),
    history: log(db, item.kind, itemId, undefined, 'Record removed', `${unit.tag} deleted`)
  };
}

// ---------------------------------------------------------------- assignment

export interface AssignInput {
  itemId: string;
  unitId: string;
  toEmployeeId?: string;
  toItemId?: string;
  toUnitId?: string;
  notes?: string;
  /** Licenses only: mark the seat as activated rather than just assigned. */
  activate?: boolean;
}

export function assignUnit(db: Db, input: AssignInput): Db {
  const item = (findItem(db, input.itemId) ?? fail('Record not found')) as Item;
  const unit = (findUnit(item, input.unitId) ?? fail('Individual record not found')) as Unit;
  const toUser = Boolean(input.toEmployeeId);
  const toAsset = Boolean(input.toItemId);
  if (!toUser && !toAsset) fail('Must assign to either a user or an asset');
  if (toUser && toAsset) fail('Cannot assign to both a user and an asset');
  if (toUser && !db.employees.some((e) => e.id === input.toEmployeeId)) fail('Selected user was not found');
  if (toAsset) {
    const parent = findItem(db, input.toItemId);
    if (!parent || parent.kind !== 'asset') fail('Selected target asset was not found');
    if (!findUnit(parent, input.toUnitId)) fail('Select the individual asset to assign to');
    if (input.toItemId === input.itemId && input.toUnitId === input.unitId) fail('An item cannot be assigned to itself');
  }
  if (unit.assignmentId) fail('Already assigned. Please return it first.');
  if (item.kind === 'asset') {
    const label = statusLabelOf(db, unit);
    if (label?.statusType !== 'Deployable') {
      fail(`Asset is not available for assignment. Current status: ${label?.name ?? 'Unknown'} (${label?.statusType ?? 'Unknown'}). Only assets with "Deployable" status can be assigned.`);
    }
  } else if (unit.state !== 'available') {
    fail(`${kindLabel[item.kind]} is not available for assignment (current state: ${unit.state}).`);
  }
  const assignment: Assignment = {
    id: newId('as'),
    kind: item.kind,
    itemId: item.id,
    unitId: unit.id,
    toEmployeeId: input.toEmployeeId,
    toItemId: input.toItemId,
    toUnitId: input.toUnitId,
    assignedAt: nowIso(),
    assignedBy: CURRENT_USER_ID,
    notes: input.notes?.trim() || undefined
  };
  const nextState = item.kind === 'asset' ? unit.state : item.kind === 'license' && input.activate ? 'activated' : 'assigned';
  const next = touch({ ...item, units: item.units.map((u) => u.id === unit.id ? { ...u, assignmentId: assignment.id, state: nextState } : u) });
  const target = assigneeLabel(db, assignment);
  return {
    ...replaceItem(db, next),
    assignments: [assignment, ...db.assignments],
    history: log(db, item.kind, item.id, unit.id, 'Assigned', `${unit.tag} assigned to ${target}`)
  };
}

export interface ReturnInput {
  assignmentId: string;
  returnNotes?: string;
  condition?: ReturnCondition;
}

export function returnAssignment(db: Db, input: ReturnInput): Db {
  const assignment = (db.assignments.find((a) => a.id === input.assignmentId) ?? fail('Assignment not found in current assignments')) as Assignment;
  if (assignment.returnedAt) fail('This assignment has already been returned');
  const item = (findItem(db, assignment.itemId) ?? fail('Record not found')) as Item;
  const unit = (findUnit(item, assignment.unitId) ?? fail('Individual record not found')) as Unit;
  if (item.kind === 'asset') {
    const label = statusLabelOf(db, unit);
    if (label && (label.statusType === 'Retired' || label.statusType === 'Archived')) {
      fail(`Cannot return asset with status "${label.name}" (${label.statusType}). Please update the status to "Deployable" first.`);
    }
  }
  const returned: Assignment = {
    ...assignment,
    returnedAt: nowIso(),
    returnedBy: CURRENT_USER_ID,
    returnNotes: input.returnNotes?.trim() || undefined,
    condition: input.condition ?? 'Good'
  };
  const nextUnit: Unit = { ...unit, assignmentId: undefined, state: item.kind === 'asset' ? unit.state : 'available' };
  const detail = `${unit.tag} returned by ${assigneeLabel(db, assignment)}${returned.condition !== 'Good' ? ` (${returned.condition})` : ''}`;
  return {
    ...replaceItem(db, touch({ ...item, units: item.units.map((u) => u.id === unit.id ? nextUnit : u) })),
    assignments: db.assignments.map((a) => a.id === returned.id ? returned : a),
    history: log(db, item.kind, item.id, unit.id, 'Returned', detail)
  };
}

// ---------------------------------------------------------------- status & maintenance

export interface MaintenanceInput {
  repairAgentId: string;
  maintenanceDate: string;
  expectedCompletionDate?: string;
  issueDescription?: string;
  notes?: string;
  cost?: number;
  status?: MaintenanceStatus;
}

const BLOCKED_WHILE_ASSIGNED: StatusType[] = ['Retired', 'Archived', 'Undeployable', 'Pending'];
const activeRecord = (m: Maintenance, unitId: string) => m.unitId === unitId && (m.status === 'pending' || m.status === 'in_progress');

export function changeAssetStatus(db: Db, input: {itemId: string;unitId: string;statusLabelId: string;maintenance?: MaintenanceInput;}): Db {
  const item = (findItem(db, input.itemId) ?? fail('Asset not found')) as Item;
  if (item.kind !== 'asset') fail('Only assets have status labels');
  const unit = (findUnit(item, input.unitId) ?? fail('Individual asset not found')) as Unit;
  const label = (db.statusLabels.find((s) => s.id === input.statusLabelId) ?? fail('Status label not found')) as StatusLabel;
  if (unit.assignmentId && BLOCKED_WHILE_ASSIGNED.includes(label.statusType)) {
    fail(`Cannot change status to "${label.name}" (${label.statusType}) while asset is assigned. Please return the asset first.`);
  }
  const old = statusLabelOf(db, unit);
  const wasMaint = old?.statusType === 'Under Maintenance';
  const toMaint = label.statusType === 'Under Maintenance';
  let maintenance = db.maintenance;
  let action = 'Status changed';
  let detail = `${unit.tag}: ${old?.name ?? 'Unknown'} → ${label.name}`;

  if (toMaint) {
    const m = input.maintenance;
    if (!m?.repairAgentId || !m.maintenanceDate) fail('Maintenance details (repair agent, maintenance date) are required for maintenance status');
    const details = m as MaintenanceInput;
    if (details.cost !== undefined && details.cost < 0) fail('Cost cannot be negative');
    if (details.expectedCompletionDate && details.expectedCompletionDate < details.maintenanceDate) fail('Expected completion cannot be before the maintenance date');
    const existing = db.maintenance.filter((x) => activeRecord(x, unit.id)).sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))[0];
    if (existing) {
      maintenance = db.maintenance.map((x) => x.id === existing.id ? { ...x, ...details, status: details.status ?? x.status } : x);
    } else {
      maintenance = [{
        id: newId('m'), itemId: item.id, unitId: unit.id, ...details,
        status: details.status ?? 'pending', assignedAt: nowIso(), assignedBy: CURRENT_USER_ID
      }, ...db.maintenance];
      action = 'Sent for maintenance';
      detail = `${unit.tag} sent to ${db.suppliers.find((s) => s.id === details.repairAgentId)?.name ?? 'repair agent'}`;
    }
  } else if (wasMaint) {
    const closing: MaintenanceStatus = input.maintenance?.status === 'cancelled' ? 'cancelled' : 'completed';
    maintenance = db.maintenance.map((x) => activeRecord(x, unit.id) ?
    {
      ...x,
      status: closing,
      completedDate: nowIso().slice(0, 10),
      returnNotes: x.returnNotes || (closing === 'cancelled' ? 'Maintenance cancelled when status changed' : 'Maintenance completed automatically when status changed')
    } :
    x);
    action = closing === 'cancelled' ? 'Maintenance cancelled' : 'Maintenance completed';
  }

  const next = touch({ ...item, units: item.units.map((u) => u.id === unit.id ? { ...u, statusLabelId: label.id } : u) });
  return { ...replaceItem(db, next), maintenance, history: log(db, 'asset', item.id, unit.id, action, detail) };
}

export function updateMaintenance(db: Db, id: string, patch: Partial<Maintenance>): Db {
  const rec = (db.maintenance.find((m) => m.id === id) ?? fail('Maintenance record not found')) as Maintenance;
  if (patch.cost !== undefined && patch.cost < 0) fail('Cost cannot be negative');
  const merged = { ...rec, ...patch };
  if (merged.expectedCompletionDate && merged.expectedCompletionDate < merged.maintenanceDate) fail('Expected completion cannot be before the maintenance date');
  return { ...db, maintenance: db.maintenance.map((m) => m.id === id ? merged : m), history: log(db, 'asset', rec.itemId, rec.unitId, 'Maintenance updated', 'Maintenance record edited') };
}

export const deployableLabel = (db: Db) => db.statusLabels.find((s) => s.statusType === 'Deployable');

// ---------------------------------------------------------------- settings (lookups)

export type Collection = 'companies' | 'departments' | 'categories' | 'manufacturers' | 'suppliers' | 'models' | 'assetTypes' | 'statusLabels' | 'customFields' | 'fieldSets';

const names: Record<Collection, string> = {
  companies: 'company',
  departments: 'department',
  categories: 'category',
  manufacturers: 'manufacturer',
  suppliers: 'supplier',
  models: 'model',
  assetTypes: 'asset type',
  statusLabels: 'status label',
  customFields: 'custom field',
  fieldSets: 'field set'
};

type Row = {id: string;name?: string;fieldName?: string;[k: string]: unknown;};

/** Names of records that still reference this one, used to block deletion. */
function usedBy(db: Db, c: Collection, id: string): string[] {
  const out: string[] = [];
  const count = (n: number, label: string) => {if (n > 0) out.push(`${n} ${label}`);};
  switch (c) {
    case 'companies':
      count(db.items.filter((i) => i.companyId === id).length, 'inventory record(s)');
      count(db.departments.filter((d) => d.companyId === id).length, 'department(s)');
      count(db.assetTypes.filter((t) => t.companyId === id).length, 'asset type(s)');
      break;
    case 'departments':
      count(db.items.filter((i) => i.departmentId === id).length, 'asset(s)');
      count(db.assetTypes.filter((t) => t.departmentId === id).length, 'asset type(s)');
      break;
    case 'categories':
      count(db.models.filter((m) => m.categoryId === id).length, 'model(s)');
      count(db.items.filter((i) => i.categoryId === id).length, 'inventory record(s)');
      break;
    case 'manufacturers':
      count(db.models.filter((m) => m.manufacturerId === id).length, 'model(s)');
      count(db.items.filter((i) => i.manufacturerId === id).length, 'inventory record(s)');
      break;
    case 'suppliers':
      count(db.items.filter((i) => i.supplierId === id).length, 'inventory record(s)');
      count(db.maintenance.filter((m) => m.repairAgentId === id).length, 'maintenance record(s)');
      break;
    case 'models':
      count(db.items.filter((i) => i.modelId === id).length, 'asset(s)');
      break;
    case 'assetTypes':
      count(db.items.filter((i) => i.assetTypeId === id).length, 'inventory record(s)');
      break;
    case 'statusLabels':
      count(db.items.flatMap((i) => i.units).filter((u) => u.statusLabelId === id).length, 'individual asset(s)');
      break;
    case 'fieldSets':
      count(db.models.filter((m) => m.fieldsetId === id).length, 'model(s)');
      break;
    default:
      break;
  }
  return out;
}

export function saveSetting(db: Db, c: Collection, record: Row): Db {
  const list = db[c] as unknown as Row[];
  const label = names[c];
  const nameOf = (r: Row) => String(r.name ?? r.fieldName ?? '').trim();
  if (!nameOf(record)) fail(`The ${label} name is required`);
  const clash = list.find((r) => r.id !== record.id && nameOf(r).toLowerCase() === nameOf(record).toLowerCase() &&
  (c !== 'departments' || r.companyId === record.companyId) && (c !== 'assetTypes' || r.companyId === record.companyId));
  if (clash) fail(`A ${label} named "${nameOf(record)}" already exists`);
  if (c === 'assetTypes' && !patternIsValid(String(record.pattern ?? ''))) fail('Asset tag pattern is invalid. Please include "XXX" as the unique sequence placeholder.');
  if (c === 'suppliers') {
    if (!/^\S+@\S+\.\S+$/.test(String(record.email ?? ''))) fail('A valid email is required');
    if (!Array.isArray(record.type) || record.type.length === 0) fail('Select at least one supplier type');
  }
  if (c === 'companies' && record.email && !/^\S+@\S+\.\S+$/.test(String(record.email))) fail('Email is not valid');
  if (c === 'models') {
    if (!record.categoryId || !record.manufacturerId) fail('Category and manufacturer are required');
    if (!String(record.modelNo ?? '').trim()) fail('Model number is required');
  }
  if (c === 'customFields') {
    const f = record as unknown as {formElement: string;options: string[];};
    if (['select', 'radio_buttons'].includes(f.formElement) && f.options.length === 0) fail('Add at least one option for this field type');
  }
  if (c === 'assetTypes') {
    const t = list.find((r) => r.id === record.id) as {pattern?: string;companyId?: string;} | undefined;
    if (t && (t.pattern !== record.pattern || t.companyId !== record.companyId)) {
      const inUse = db.items.filter((i) => i.assetTypeId === record.id).length;
      if (inUse) fail(`Cannot change the pattern or company of an asset type used by ${inUse} record(s)`);
    }
  }
  const exists = list.some((r) => r.id === record.id);
  const next = exists ? list.map((r) => r.id === record.id ? record : r) : [...list, record];
  return { ...db, [c]: next } as Db;
}

export function deleteSetting(db: Db, c: Collection, id: string): Db {
  const refs = usedBy(db, c, id);
  if (refs.length) fail(`Cannot delete this ${names[c]}. It is used by ${refs.join(', ')}.`);
  let next: Db = { ...db, [c]: (db[c] as unknown as Row[]).filter((r) => r.id !== id) } as Db;
  if (c === 'fieldSets') next = { ...next, customFields: next.customFields.map((f) => ({ ...f, fieldsetIds: f.fieldsetIds.filter((x) => x !== id) })) };
  return next;
}

/** Runs a removal for each id. Ones that are blocked by a business rule are skipped and counted. */
export function bulkRemove(db: Db, ids: string[], remove: (d: Db, id: string) => Db): {db: Db;done: number;failed: number;firstError?: string;} {
  let next = db;
  let done = 0;
  let failed = 0;
  let firstError: string | undefined;
  for (const id of ids) {
    try {
      next = remove(next, id);
      done++;
    } catch (e) {
      if (!(e instanceof ServiceError)) throw e;
      failed++;
      firstError = firstError ?? e.message;
    }
  }
  return { db: next, done, failed, firstError };
}
