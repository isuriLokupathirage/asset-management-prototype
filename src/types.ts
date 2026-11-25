/**
 * Domain model for the Asset Management prototype.
 * Mirrors the legacy Access360 Asset Management data model (Accxis360.Api/src/asset-management),
 * flattened to plain string ids so it can live in browser storage.
 */

export type Kind = 'asset' | 'license' | 'component' | 'accessory';
export const KINDS: Kind[] = ['asset', 'license', 'component', 'accessory'];
export const kindLabel: Record<Kind, string> = {
  asset: 'Asset',
  license: 'License',
  component: 'Component',
  accessory: 'Accessory'
};
export const kindPlural: Record<Kind, string> = {
  asset: 'Assets',
  license: 'Licenses',
  component: 'Components',
  accessory: 'Accessories'
};
/** Name of the individual record: an asset has "units", a license has "seats". */
export const unitLabel: Record<Kind, string> = {
  asset: 'Individual asset',
  license: 'Seat',
  component: 'Individual component',
  accessory: 'Individual accessory'
};

export type StatusType =
'Deployable' |
'Undeployable' |
'Under Maintenance' |
'Pending' |
'Retired' |
'Archived';
export const STATUS_TYPES: StatusType[] = [
'Deployable',
'Undeployable',
'Under Maintenance',
'Pending',
'Retired',
'Archived'];


export interface Company {id: string;name: string;email?: string;phone?: string;note?: string;}
export interface Department {
  id: string;
  name: string;
  companyId: string;
  managerId?: string;
  location?: string;
  phone?: string;
  note?: string;
}
export interface Category {id: string;name: string;type?: Kind;note?: string;}
export interface Manufacturer {id: string;name: string;note?: string;}
export type SupplierRole = 'supplier' | 'repair agent';
export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone?: string;
  webURL?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  type: SupplierRole[];
}
export type Depreciation =
'Do Not Depreciate' |
'Computer Depreciation' |
'Display Depreciation' |
'Mobile Phone Depreciation';
export const DEPRECIATIONS: Depreciation[] = [
'Do Not Depreciate',
'Computer Depreciation',
'Display Depreciation',
'Mobile Phone Depreciation'];

export interface AssetModel {
  id: string;
  name: string;
  categoryId: string;
  manufacturerId: string;
  modelNo: string;
  depreciation: Depreciation;
  minQty: number;
  /** End-of-life, in months from purchase. */
  eol?: number;
  fieldsetId?: string;
  notes?: string;
}
export interface AssetType {
  id: string;
  name: string;
  /** Tag pattern. "XXX" is the sequence placeholder, e.g. LAP-XXX. */
  pattern: string;
  kind: Kind;
  companyId: string;
  departmentId?: string;
  notes?: string;
}
export interface StatusLabel {id: string;name: string;statusType: StatusType;note?: string;}

export type FormElement = 'text_box' | 'text_area' | 'check_box' | 'radio_buttons' | 'select';
export type FieldFormat = 'any' | 'alpha' | 'alpha_numeric' | 'numeric' | 'email' | 'date' | 'url' | 'ip' | 'mac' | 'boolean';
export interface CustomField {
  id: string;
  fieldName: string;
  formElement: FormElement;
  format: FieldFormat;
  fieldsetIds: string[];
  options: string[];
  required: boolean;
  displayInCheckout: boolean;
  displayInCheckin: boolean;
}
export interface FieldSet {id: string;name: string;}

export interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  departmentId: string;
  companyId: string;
  branch: string;
}

export type UnitState = 'available' | 'assigned' | 'maintenance' | 'retired' | 'activated' | 'expired';

export interface Unit {
  id: string;
  /** Asset tag (assets) or tag (components / accessories / licenses). */
  tag: string;
  serial?: string;
  licenseKey?: string;
  /** Assets only: the status label. */
  statusLabelId?: string;
  /** Licenses, components and accessories. */
  state: UnitState;
  assignmentId?: string;
  warrantyExpiry?: string;
  eolDate?: string;
  expirationDate?: string;
  condition?: string;
  notes?: string;
  internalNotes?: string;
  handoverNotes?: string;
  customValues?: Record<string, string>;
}

/** A group of individual items: an Asset (with its units), a License (with seats), and so on. */
export interface Item {
  id: string;
  kind: Kind;
  name: string;
  companyId: string;
  departmentId?: string;
  modelId?: string;
  categoryId?: string;
  manufacturerId?: string;
  assetTypeId?: string;
  modelNumber?: string;
  supplierId?: string;
  orderNumber?: string;
  purchaseOrderNumber?: string;
  /** Total cost for an asset or license, unit cost for a component or accessory. */
  cost?: number;
  purchaseDate?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceFileName?: string;
  minQty: number;
  notes?: string;
  expectedCheckinDate?: string;
  licensedToName?: string;
  licensedToEmail?: string;
  reassignable?: boolean;
  maintained?: boolean;
  terminationDate?: string;
  units: Unit[];
  createdAt: string;
  updatedAt: string;
}

export type ReturnCondition = 'Good' | 'Damaged' | 'Lost';

export interface Assignment {
  id: string;
  kind: Kind;
  itemId: string;
  unitId: string;
  toEmployeeId?: string;
  /** When assigned to another asset (parent), the asset group and the specific unit. */
  toItemId?: string;
  toUnitId?: string;
  assignedAt: string;
  assignedBy: string;
  notes?: string;
  returnedAt?: string;
  returnedBy?: string;
  returnNotes?: string;
  condition?: ReturnCondition;
}

export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export interface Maintenance {
  id: string;
  itemId: string;
  unitId: string;
  repairAgentId: string;
  maintenanceDate: string;
  expectedCompletionDate?: string;
  issueDescription?: string;
  notes?: string;
  cost?: number;
  status: MaintenanceStatus;
  assignedAt: string;
  assignedBy: string;
  completedDate?: string;
  returnNotes?: string;
}

export interface HistoryEvent {
  id: string;
  at: string;
  by: string;
  kind: Kind;
  itemId: string;
  unitId?: string;
  action: string;
  detail?: string;
}

export interface Db {
  companies: Company[];
  departments: Department[];
  categories: Category[];
  manufacturers: Manufacturer[];
  suppliers: Supplier[];
  models: AssetModel[];
  assetTypes: AssetType[];
  statusLabels: StatusLabel[];
  customFields: CustomField[];
  fieldSets: FieldSet[];
  employees: Employee[];
  items: Item[];
  assignments: Assignment[];
  maintenance: Maintenance[];
  history: HistoryEvent[];
}

/** The signed-in demo user (no real authentication in this prototype). */
export const CURRENT_USER_ID = 'emp-01';
