import type { Db, Kind } from '../types';
import { KINDS } from '../types';
import { daysFromNow } from './format';
import { itemCounts, unitStatus } from '../services/domain';

export function totals(db: Db) {
  return KINDS.map((kind) => {
    const items = db.items.filter((i) => i.kind === kind);
    const c = items.reduce((acc, i) => {
      const x = itemCounts(db, i);
      return { total: acc.total + x.total, available: acc.available + x.available, assigned: acc.assigned + x.assigned };
    }, { total: 0, available: 0, assigned: 0 });
    return { kind, records: items.length, ...c };
  });
}

export function assetsByStatus(db: Db) {
  const map = new Map<string, {name: string;type: string;count: number;}>();
  db.items.filter((i) => i.kind === 'asset').forEach((i) => i.units.forEach((u) => {
    const l = db.statusLabels.find((s) => s.id === u.statusLabelId);
    if (!l) return;
    const e = map.get(l.id) ?? { name: l.name, type: l.statusType, count: 0 };
    e.count++;
    map.set(l.id, e);
  }));
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export interface ExpiringRow {
  key: string;
  itemId: string;
  kind: Kind;
  name: string;
  tag: string;
  type: 'EOL' | 'License expiry';
  detail: string;
  company: string;
  date: string;
  days: number;
  status: 'expired' | 'expiring_soon' | 'warning';
}

/** Individual assets past or near end of life, and licenses past or near expiry, within `window` days. */
export function expiringRows(db: Db, window = 30): ExpiringRow[] {
  const rows: ExpiringRow[] = [];
  const classify = (days: number): ExpiringRow['status'] => days < 0 ? 'expired' : days <= 7 ? 'expiring_soon' : 'warning';
  db.items.forEach((i) => i.units.forEach((u) => {
    if (i.kind === 'asset' && u.eolDate) {
      const days = daysFromNow(u.eolDate);
      if (days <= window) rows.push({ key: u.id, itemId: i.id, kind: i.kind, name: i.name, tag: u.tag, type: 'EOL', detail: `Tag: ${u.tag}${u.serial ? ` · Serial: ${u.serial}` : ''}`, company: db.companies.find((c) => c.id === i.companyId)?.name ?? '', date: u.eolDate, days, status: classify(days) });
    }
    if (i.kind === 'license' && u.expirationDate) {
      const days = daysFromNow(u.expirationDate);
      if (days <= window) rows.push({ key: u.id, itemId: i.id, kind: i.kind, name: i.name, tag: u.tag, type: 'License expiry', detail: `Key: ${u.licenseKey ?? u.tag}`, company: db.companies.find((c) => c.id === i.companyId)?.name ?? '', date: u.expirationDate, days, status: classify(days) });
    }
  }));
  return rows.sort((a, b) => a.days - b.days);
}

/** New records per month for the last `months` months. */
export function newByMonth(db: Db, months = 6) {
  const now = new Date();
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-GB', { month: 'short' }), asset: 0, license: 0, component: 0, accessory: 0 };
  });
  db.items.forEach((i) => {
    const d = new Date(i.purchaseDate ?? i.createdAt);
    const b = buckets.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (b) b[i.kind] += i.units.length;
  });
  return buckets;
}

export function employeeAssignments(db: Db, employeeId: string) {
  const current = db.assignments.filter((a) => a.toEmployeeId === employeeId && !a.returnedAt);
  const history = db.assignments.filter((a) => a.toEmployeeId === employeeId && a.returnedAt);
  const byKind = Object.fromEntries(KINDS.map((k) => [k, current.filter((a) => a.kind === k).length])) as Record<Kind, number>;
  return { current, history, byKind };
}

export { unitStatus };
