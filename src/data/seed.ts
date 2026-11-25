import type {
  Assignment,
  Db,
  Employee,
  HistoryEvent,
  Item,
  Kind,
  Maintenance,
  Unit,
  UnitState } from
'../types';
import { CURRENT_USER_ID } from '../types';

/** Dates are relative to "now" so the dashboard's expiry widgets always have something to show. */
const day = 86400000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();
const dateOnly = (offsetDays: number) => iso(offsetDays).slice(0, 10);

export function buildSeed(): Db {
  const companies = [
  { id: 'co-1', name: 'Accxis Technologies (Pvt) Ltd', email: 'info@accxis.example', phone: '+94 11 234 5678', note: 'Head office' },
  { id: 'co-2', name: 'Accxis Lanka Operations', email: 'ops@accxis.example', phone: '+94 11 765 4321', note: 'Operations and delivery' }];


  const employees: Employee[] = [
  { id: 'emp-01', name: 'Dilani Jayawardena', email: 'dilani.j@accxis.example', position: 'IT Asset Manager', departmentId: 'dep-it', companyId: 'co-1', branch: 'Colombo HQ' },
  { id: 'emp-02', name: 'Kasun Fernando', email: 'kasun.f@accxis.example', position: 'Senior Software Engineer', departmentId: 'dep-eng', companyId: 'co-1', branch: 'Colombo HQ' },
  { id: 'emp-03', name: 'Nimali Perera', email: 'nimali.p@accxis.example', position: 'HR Business Partner', departmentId: 'dep-hr', companyId: 'co-1', branch: 'Colombo HQ' },
  { id: 'emp-04', name: 'Tharindu Silva', email: 'tharindu.s@accxis.example', position: 'QA Engineer', departmentId: 'dep-eng', companyId: 'co-1', branch: 'Kandy' },
  { id: 'emp-05', name: 'Ishara Wickramasinghe', email: 'ishara.w@accxis.example', position: 'Financial Analyst', departmentId: 'dep-fin', companyId: 'co-1', branch: 'Colombo HQ' },
  { id: 'emp-06', name: 'Mahesh Rathnayake', email: 'mahesh.r@accxis.example', position: 'Sales Manager', departmentId: 'dep-sales', companyId: 'co-2', branch: 'Galle' },
  { id: 'emp-07', name: 'Sanduni Gunasekara', email: 'sanduni.g@accxis.example', position: 'UX Designer', departmentId: 'dep-eng', companyId: 'co-1', branch: 'Colombo HQ' },
  { id: 'emp-08', name: 'Chamara Bandara', email: 'chamara.b@accxis.example', position: 'Network Administrator', departmentId: 'dep-it', companyId: 'co-1', branch: 'Colombo HQ' },
  { id: 'emp-09', name: 'Hasini Abeysekara', email: 'hasini.a@accxis.example', position: 'Operations Lead', departmentId: 'dep-ops', companyId: 'co-2', branch: 'Kandy' },
  { id: 'emp-10', name: 'Ruwan Dissanayake', email: 'ruwan.d@accxis.example', position: 'Account Executive', departmentId: 'dep-sales', companyId: 'co-2', branch: 'Galle' },
  { id: 'emp-11', name: 'Piumi Senanayake', email: 'piumi.s@accxis.example', position: 'Product Manager', departmentId: 'dep-eng', companyId: 'co-1', branch: 'Colombo HQ' },
  { id: 'emp-12', name: 'Lakmal Herath', email: 'lakmal.h@accxis.example', position: 'Support Engineer', departmentId: 'dep-ops', companyId: 'co-2', branch: 'Colombo HQ' }];


  const departments = [
  { id: 'dep-it', name: 'Information Technology', companyId: 'co-1', managerId: 'emp-01', location: 'Floor 3', phone: '+94 11 234 5601', note: '' },
  { id: 'dep-eng', name: 'Engineering', companyId: 'co-1', managerId: 'emp-11', location: 'Floor 4', phone: '+94 11 234 5602', note: '' },
  { id: 'dep-hr', name: 'Human Resources', companyId: 'co-1', managerId: 'emp-03', location: 'Floor 2', phone: '+94 11 234 5603', note: '' },
  { id: 'dep-fin', name: 'Finance', companyId: 'co-1', managerId: 'emp-05', location: 'Floor 2', phone: '+94 11 234 5604', note: '' },
  { id: 'dep-sales', name: 'Sales', companyId: 'co-2', managerId: 'emp-06', location: 'Galle branch', phone: '+94 91 222 3300', note: '' },
  { id: 'dep-ops', name: 'Operations', companyId: 'co-2', managerId: 'emp-09', location: 'Kandy branch', phone: '+94 81 222 4400', note: '' }];


  const categories = [
  { id: 'cat-lap', name: 'Laptops', type: 'asset' as Kind },
  { id: 'cat-desk', name: 'Desktops', type: 'asset' as Kind },
  { id: 'cat-mon', name: 'Monitors', type: 'asset' as Kind },
  { id: 'cat-mob', name: 'Mobile Devices', type: 'asset' as Kind },
  { id: 'cat-net', name: 'Networking', type: 'asset' as Kind },
  { id: 'cat-sw', name: 'Software', type: 'license' as Kind },
  { id: 'cat-mem', name: 'Memory & Storage', type: 'component' as Kind },
  { id: 'cat-per', name: 'Peripherals', type: 'accessory' as Kind }];


  const manufacturers = [
  { id: 'mf-dell', name: 'Dell Technologies', note: 'Laptops, desktops and monitors' },
  { id: 'mf-hp', name: 'HP Inc.', note: '' },
  { id: 'mf-len', name: 'Lenovo', note: '' },
  { id: 'mf-app', name: 'Apple', note: '' },
  { id: 'mf-ms', name: 'Microsoft', note: 'Software and licensing' },
  { id: 'mf-ado', name: 'Adobe', note: '' },
  { id: 'mf-jb', name: 'JetBrains', note: '' },
  { id: 'mf-atl', name: 'Atlassian', note: '' },
  { id: 'mf-log', name: 'Logitech', note: '' },
  { id: 'mf-cis', name: 'Cisco', note: '' },
  { id: 'mf-kin', name: 'Kingston', note: '' },
  { id: 'mf-sam', name: 'Samsung', note: '' }];


  const suppliers = [
  { id: 'sup-1', name: 'Vision IT Distribution', contactName: 'Anjana Ratnayake', email: 'sales@visionit.example', phone: '+94 11 555 0101', webURL: 'https://visionit.example', address: '12 Galle Road', city: 'Colombo 03', state: 'Western', postalCode: '00300', country: 'Sri Lanka', type: ['supplier' as const] },
  { id: 'sup-2', name: 'Abans Business Solutions', contactName: 'Priyantha Kumara', email: 'b2b@abans.example', phone: '+94 11 555 0202', webURL: '', address: '498 Union Place', city: 'Colombo 02', state: 'Western', postalCode: '00200', country: 'Sri Lanka', type: ['supplier' as const] },
  { id: 'sup-3', name: 'Softlogic Computers', contactName: 'Dhanushka Peiris', email: 'corporate@softlogic.example', phone: '+94 11 555 0303', webURL: '', address: '14 Duplication Road', city: 'Colombo 04', state: 'Western', postalCode: '00400', country: 'Sri Lanka', type: ['supplier' as const] },
  { id: 'sup-4', name: 'TechFix Lanka Service Centre', contactName: 'Roshan Gamage', email: 'service@techfix.example', phone: '+94 11 555 0404', webURL: '', address: '88 High Level Road', city: 'Nugegoda', state: 'Western', postalCode: '10250', country: 'Sri Lanka', type: ['repair agent' as const] },
  { id: 'sup-5', name: 'Dell Authorised Service Centre', contactName: 'Sachini Weerasinghe', email: 'support@dellservice.example', phone: '+94 11 555 0505', webURL: '', address: '3 Park Street', city: 'Colombo 02', state: 'Western', postalCode: '00200', country: 'Sri Lanka', type: ['supplier' as const, 'repair agent' as const] }];


  const models = [
  { id: 'mod-mbp', name: 'MacBook Pro 14" M3', categoryId: 'cat-lap', manufacturerId: 'mf-app', modelNo: 'MR7J3', depreciation: 'Computer Depreciation' as const, minQty: 2, eol: 48, fieldsetId: 'fs-comp', notes: '' },
  { id: 'mod-lat', name: 'Latitude 5440', categoryId: 'cat-lap', manufacturerId: 'mf-dell', modelNo: 'LAT-5440', depreciation: 'Computer Depreciation' as const, minQty: 3, eol: 48, fieldsetId: 'fs-comp', notes: '' },
  { id: 'mod-t14', name: 'ThinkPad T14 Gen 4', categoryId: 'cat-lap', manufacturerId: 'mf-len', modelNo: '21HD', depreciation: 'Computer Depreciation' as const, minQty: 2, eol: 48, fieldsetId: 'fs-comp', notes: '' },
  { id: 'mod-edk', name: 'EliteDesk 800 G9', categoryId: 'cat-desk', manufacturerId: 'mf-hp', modelNo: '6B2A1EA', depreciation: 'Computer Depreciation' as const, minQty: 1, eol: 60, fieldsetId: 'fs-comp', notes: '' },
  { id: 'mod-u27', name: 'UltraSharp U2723QE 27"', categoryId: 'cat-mon', manufacturerId: 'mf-dell', modelNo: 'U2723QE', depreciation: 'Display Depreciation' as const, minQty: 2, eol: 72, notes: '' },
  { id: 'mod-ip', name: 'iPhone 14', categoryId: 'cat-mob', manufacturerId: 'mf-app', modelNo: 'MPUR3', depreciation: 'Mobile Phone Depreciation' as const, minQty: 1, eol: 36, notes: '' },
  { id: 'mod-cat', name: 'Catalyst 9200L-24T', categoryId: 'cat-net', manufacturerId: 'mf-cis', modelNo: 'C9200L-24T', depreciation: 'Do Not Depreciate' as const, minQty: 1, eol: 84, notes: 'Core switch' }];


  const assetTypes = [
  { id: 'at-lap', name: 'Laptop', pattern: 'LAP-XXX', kind: 'asset' as Kind, companyId: 'co-1', notes: '' },
  { id: 'at-desk', name: 'Desktop', pattern: 'DSK-XXX', kind: 'asset' as Kind, companyId: 'co-1', notes: '' },
  { id: 'at-mon', name: 'Monitor', pattern: 'MON-XXX', kind: 'asset' as Kind, companyId: 'co-1', notes: '' },
  { id: 'at-mob', name: 'Mobile Phone', pattern: 'MOB-XXX', kind: 'asset' as Kind, companyId: 'co-1', notes: '' },
  { id: 'at-net', name: 'Network Equipment', pattern: 'NET-XXX', kind: 'asset' as Kind, companyId: 'co-1', departmentId: 'dep-it', notes: '' },
  { id: 'at-lic', name: 'Software License', pattern: 'LIC-XXX', kind: 'license' as Kind, companyId: 'co-1', notes: '' },
  { id: 'at-cmp', name: 'Hardware Component', pattern: 'CMP-XXX', kind: 'component' as Kind, companyId: 'co-1', notes: '' },
  { id: 'at-acc', name: 'Accessory', pattern: 'ACC-XXX', kind: 'accessory' as Kind, companyId: 'co-1', notes: '' }];


  const statusLabels = [
  { id: 'st-rtd', name: 'Ready to Deploy', statusType: 'Deployable' as const, note: 'Tested and ready for assignment' },
  { id: 'st-qa', name: 'Pending QA', statusType: 'Pending' as const, note: 'Awaiting configuration and quality check' },
  { id: 'st-rep', name: 'Out for Repair', statusType: 'Under Maintenance' as const, note: 'With a repair agent' },
  { id: 'st-brk', name: 'Broken - Not Fixable', statusType: 'Undeployable' as const, note: '' },
  { id: 'st-lost', name: 'Lost / Stolen', statusType: 'Undeployable' as const, note: '' },
  { id: 'st-ret', name: 'Retired', statusType: 'Retired' as const, note: 'End of life, disposed' },
  { id: 'st-arc', name: 'Archived', statusType: 'Archived' as const, note: 'Kept for records only' }];


  const fieldSets = [
  { id: 'fs-comp', name: 'Computer Specifications' }];


  const customFields = [
  { id: 'cf-ram', fieldName: 'RAM', formElement: 'select' as const, format: 'any' as const, fieldsetIds: ['fs-comp'], options: ['8 GB', '16 GB', '32 GB', '64 GB'], required: true, displayInCheckout: true, displayInCheckin: false },
  { id: 'cf-cpu', fieldName: 'Processor', formElement: 'text_box' as const, format: 'any' as const, fieldsetIds: ['fs-comp'], options: [], required: false, displayInCheckout: true, displayInCheckin: false },
  { id: 'cf-mac', fieldName: 'MAC Address', formElement: 'text_box' as const, format: 'mac' as const, fieldsetIds: ['fs-comp'], options: [], required: false, displayInCheckout: false, displayInCheckin: false },
  { id: 'cf-bag', fieldName: 'Charger and bag included', formElement: 'check_box' as const, format: 'boolean' as const, fieldsetIds: ['fs-comp'], options: [], required: false, displayInCheckout: true, displayInCheckin: true }];


  // ---------- Items ----------
  let unitCounter = 0;
  const unit = (tag: string, extra: Partial<Unit>): Unit => ({
    id: `u-${++unitCounter}`,
    tag,
    state: 'available',
    ...extra
  });
  const pad = (n: number) => String(n).padStart(3, '0');
  const nowIso = iso(-120);

  const assetUnits = (prefix: string, count: number, startAt: number, serialPrefix: string, label: string, purchaseOffset: number): Unit[] =>
  Array.from({ length: count }, (_, i) =>
  unit(`${prefix}-${pad(startAt + i)}`, {
    serial: `${serialPrefix}${(48210 + startAt * 7 + i * 13).toString(36).toUpperCase()}`,
    statusLabelId: label,
    warrantyExpiry: dateOnly(purchaseOffset + 365 * 3),
    eolDate: dateOnly(purchaseOffset + 365 * 4),
    customValues: prefix === 'LAP' || prefix === 'DSK' ? { 'cf-ram': i % 2 ? '16 GB' : '32 GB', 'cf-cpu': i % 2 ? 'Intel Core i7' : 'Apple M3' } : undefined
  }));


  const mk = (p: Partial<Item> & Pick<Item, 'id' | 'kind' | 'name' | 'companyId' | 'units'>): Item => ({
    minQty: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    ...p
  });

  const items: Item[] = [
  mk({ id: 'ast-1', kind: 'asset', name: 'MacBook Pro 14" - Engineering', companyId: 'co-1', departmentId: 'dep-eng', modelId: 'mod-mbp', assetTypeId: 'at-lap', supplierId: 'sup-1', orderNumber: 'PO-2024-0112', cost: 2100000, purchaseDate: dateOnly(-300), invoiceNumber: 'INV-88121', invoiceDate: dateOnly(-300), invoiceFileName: 'INV-88121.pdf', minQty: 2, notes: 'Standard issue for engineers', units: assetUnits('LAP', 5, 1, 'C02', 'st-rtd', -300) }),
  mk({ id: 'ast-2', kind: 'asset', name: 'Dell Latitude 5440 - General', companyId: 'co-1', departmentId: 'dep-it', modelId: 'mod-lat', assetTypeId: 'at-lap', supplierId: 'sup-2', orderNumber: 'PO-2024-0201', cost: 1440000, purchaseDate: dateOnly(-420), invoiceNumber: 'INV-5521', invoiceDate: dateOnly(-420), invoiceFileName: 'INV-5521.pdf', minQty: 3, units: assetUnits('LAP', 8, 6, 'DL', 'st-rtd', -420) }),
  mk({ id: 'ast-3', kind: 'asset', name: 'ThinkPad T14 - Operations', companyId: 'co-2', departmentId: 'dep-ops', modelId: 'mod-t14', assetTypeId: 'at-lap', supplierId: 'sup-3', orderNumber: 'PO-2023-0877', cost: 1080000, purchaseDate: dateOnly(-800), invoiceNumber: 'SL-20311', invoiceDate: dateOnly(-800), minQty: 2, units: assetUnits('LAP', 6, 14, 'PF', 'st-rtd', -800) }),
  mk({ id: 'ast-4', kind: 'asset', name: 'HP EliteDesk 800 - Front Office', companyId: 'co-1', departmentId: 'dep-fin', modelId: 'mod-edk', assetTypeId: 'at-desk', supplierId: 'sup-1', orderNumber: 'PO-2022-0450', cost: 760000, purchaseDate: dateOnly(-1300), invoiceNumber: 'INV-4402', invoiceDate: dateOnly(-1300), minQty: 1, units: assetUnits('DSK', 4, 1, 'HP', 'st-rtd', -1300) }),
  mk({ id: 'ast-5', kind: 'asset', name: 'Dell UltraSharp 27" Monitors', companyId: 'co-1', departmentId: 'dep-eng', modelId: 'mod-u27', assetTypeId: 'at-mon', supplierId: 'sup-2', orderNumber: 'PO-2024-0310', cost: 540000, purchaseDate: dateOnly(-250), invoiceNumber: 'INV-6630', invoiceDate: dateOnly(-250), minQty: 2, units: assetUnits('MON', 6, 1, 'CN', 'st-rtd', -250) }),
  mk({ id: 'ast-6', kind: 'asset', name: 'iPhone 14 - Sales Team', companyId: 'co-2', departmentId: 'dep-sales', modelId: 'mod-ip', assetTypeId: 'at-mob', supplierId: 'sup-1', orderNumber: 'PO-2024-0505', cost: 870000, purchaseDate: dateOnly(-200), invoiceNumber: 'INV-9901', invoiceDate: dateOnly(-200), minQty: 1, units: assetUnits('MOB', 3, 1, 'F2', 'st-rtd', -200) }),
  mk({ id: 'ast-7', kind: 'asset', name: 'Cisco Catalyst 9200L Switch', companyId: 'co-1', departmentId: 'dep-it', modelId: 'mod-cat', assetTypeId: 'at-net', supplierId: 'sup-1', orderNumber: 'PO-2023-0120', cost: 640000, purchaseDate: dateOnly(-900), invoiceNumber: 'INV-3320', invoiceDate: dateOnly(-900), minQty: 1, units: assetUnits('NET', 2, 1, 'FOC', 'st-rtd', -900) }),

  mk({ id: 'lic-1', kind: 'license', name: 'Microsoft 365 Business Premium', companyId: 'co-1', categoryId: 'cat-sw', manufacturerId: 'mf-ms', assetTypeId: 'at-lic', supplierId: 'sup-1', orderNumber: 'PO-2024-0601', purchaseOrderNumber: 'PO-2024-0601', cost: 480000, purchaseDate: dateOnly(-180), invoiceNumber: 'INV-7100', invoiceDate: dateOnly(-180), minQty: 3, licensedToName: 'Accxis Technologies', licensedToEmail: 'it@accxis.example', reassignable: true, maintained: true, units: Array.from({ length: 10 }, (_, i) => unit(`LIC-${pad(1 + i)}`, { licenseKey: `M365-${1000 + i * 37}-BPRM`, expirationDate: dateOnly(185) })) }),
  mk({ id: 'lic-2', kind: 'license', name: 'Adobe Creative Cloud (All Apps)', companyId: 'co-1', categoryId: 'cat-sw', manufacturerId: 'mf-ado', assetTypeId: 'at-lic', supplierId: 'sup-3', orderNumber: 'PO-2024-0777', cost: 360000, purchaseDate: dateOnly(-340), invoiceNumber: 'AD-3345', invoiceDate: dateOnly(-340), minQty: 1, licensedToName: 'Design Team', licensedToEmail: 'design@accxis.example', reassignable: true, maintained: true, units: Array.from({ length: 4 }, (_, i) => unit(`LIC-${pad(11 + i)}`, { licenseKey: `ACC-AD-${5500 + i * 11}`, expirationDate: dateOnly(i === 0 ? 5 : 25 + i) })) }),
  mk({ id: 'lic-3', kind: 'license', name: 'JetBrains IntelliJ IDEA Ultimate', companyId: 'co-1', categoryId: 'cat-sw', manufacturerId: 'mf-jb', assetTypeId: 'at-lic', supplierId: 'sup-1', orderNumber: 'PO-2024-0440', cost: 210000, purchaseDate: dateOnly(-370), invoiceNumber: 'JB-1180', invoiceDate: dateOnly(-370), minQty: 1, licensedToName: 'Engineering', licensedToEmail: 'eng@accxis.example', reassignable: false, maintained: false, units: Array.from({ length: 3 }, (_, i) => unit(`LIC-${pad(15 + i)}`, { licenseKey: `IIU-${7700 + i * 19}-JB`, expirationDate: dateOnly(i === 2 ? -12 : 18), state: i === 2 ? 'expired' : 'available' })) }),
  mk({ id: 'lic-4', kind: 'license', name: 'Atlassian Jira Software Cloud', companyId: 'co-1', categoryId: 'cat-sw', manufacturerId: 'mf-atl', assetTypeId: 'at-lic', supplierId: 'sup-1', orderNumber: 'PO-2024-0890', cost: 290000, purchaseDate: dateOnly(-90), invoiceNumber: 'ATL-8899', invoiceDate: dateOnly(-90), minQty: 2, licensedToName: 'Accxis Technologies', licensedToEmail: 'it@accxis.example', reassignable: true, maintained: true, units: Array.from({ length: 8 }, (_, i) => unit(`LIC-${pad(18 + i)}`, { licenseKey: `JIRA-${3100 + i * 7}-CL`, expirationDate: dateOnly(275) })) }),
  mk({ id: 'lic-5', kind: 'license', name: 'Windows 11 Pro', companyId: 'co-2', categoryId: 'cat-sw', manufacturerId: 'mf-ms', assetTypeId: 'at-lic', supplierId: 'sup-2', orderNumber: 'PO-2023-0999', cost: 210000, purchaseDate: dateOnly(-500), invoiceNumber: 'INV-2290', invoiceDate: dateOnly(-500), minQty: 1, licensedToName: 'Accxis Lanka Operations', licensedToEmail: 'ops@accxis.example', reassignable: false, maintained: false, units: Array.from({ length: 6 }, (_, i) => unit(`LIC-${pad(26 + i)}`, { licenseKey: `W11P-${9000 + i * 23}-XQ` })) }),

  mk({ id: 'cmp-1', kind: 'component', name: 'Kingston Fury 16GB DDR5 SODIMM', companyId: 'co-1', categoryId: 'cat-mem', manufacturerId: 'mf-kin', assetTypeId: 'at-cmp', modelNumber: 'KF556S40-16', supplierId: 'sup-3', orderNumber: 'PO-2024-0702', cost: 24000, purchaseDate: dateOnly(-150), invoiceNumber: 'SL-30210', invoiceDate: dateOnly(-150), minQty: 3, units: Array.from({ length: 10 }, (_, i) => unit(`CMP-${pad(1 + i)}`, { serial: `KN${88200 + i}`, condition: 'New' })) }),
  mk({ id: 'cmp-2', kind: 'component', name: 'Samsung 980 Pro 1TB NVMe SSD', companyId: 'co-1', categoryId: 'cat-mem', manufacturerId: 'mf-sam', assetTypeId: 'at-cmp', modelNumber: 'MZ-V8P1T0', supplierId: 'sup-1', orderNumber: 'PO-2024-0703', cost: 42000, purchaseDate: dateOnly(-150), invoiceNumber: 'INV-7733', invoiceDate: dateOnly(-150), minQty: 2, units: Array.from({ length: 8 }, (_, i) => unit(`CMP-${pad(11 + i)}`, { serial: `S6B${51120 + i * 3}`, condition: 'New' })) }),

  mk({ id: 'acc-1', kind: 'accessory', name: 'Logitech MX Master 3S Mouse', companyId: 'co-1', categoryId: 'cat-per', manufacturerId: 'mf-log', assetTypeId: 'at-acc', modelNumber: '910-006559', supplierId: 'sup-2', orderNumber: 'PO-2024-0455', cost: 32000, purchaseDate: dateOnly(-210), invoiceNumber: 'INV-6101', invoiceDate: dateOnly(-210), minQty: 3, units: Array.from({ length: 12 }, (_, i) => unit(`ACC-${pad(1 + i)}`, { serial: `LG${22100 + i * 5}`, condition: 'New' })) }),
  mk({ id: 'acc-2', kind: 'accessory', name: 'Logitech MX Keys Keyboard', companyId: 'co-1', categoryId: 'cat-per', manufacturerId: 'mf-log', assetTypeId: 'at-acc', modelNumber: '920-009295', supplierId: 'sup-2', orderNumber: 'PO-2024-0455', cost: 34000, purchaseDate: dateOnly(-210), invoiceNumber: 'INV-6101', invoiceDate: dateOnly(-210), minQty: 3, units: Array.from({ length: 10 }, (_, i) => unit(`ACC-${pad(13 + i)}`, { serial: `LK${33100 + i * 5}`, condition: 'New' })) }),
  mk({ id: 'acc-3', kind: 'accessory', name: 'Dell USB-C Dock WD22TB4', companyId: 'co-1', categoryId: 'cat-per', manufacturerId: 'mf-dell', assetTypeId: 'at-acc', modelNumber: 'WD22TB4', supplierId: 'sup-2', orderNumber: 'PO-2024-0612', cost: 78000, purchaseDate: dateOnly(-120), invoiceNumber: 'INV-6660', invoiceDate: dateOnly(-120), minQty: 2, units: Array.from({ length: 6 }, (_, i) => unit(`ACC-${pad(23 + i)}`, { serial: `DK${71000 + i * 9}`, condition: 'New' })) }),
  mk({ id: 'acc-4', kind: 'accessory', name: 'Jabra Evolve2 65 Headset', companyId: 'co-2', categoryId: 'cat-per', manufacturerId: 'mf-log', assetTypeId: 'at-acc', modelNumber: 'EV2-65', supplierId: 'sup-1', orderNumber: 'PO-2024-0818', cost: 45000, purchaseDate: dateOnly(-100), invoiceNumber: 'INV-9120', invoiceDate: dateOnly(-100), minQty: 2, units: Array.from({ length: 8 }, (_, i) => unit(`ACC-${pad(29 + i)}`, { serial: `JB${61100 + i * 4}`, condition: 'New' })) })];


  const assignments: Assignment[] = [];
  const history: HistoryEvent[] = [];
  const maintenance: Maintenance[] = [];
  const itemById = (id: string) => items.find((i) => i.id === id)!;

  const addHistory = (kind: Kind, itemId: string, unitId: string | undefined, action: string, detail: string, offset: number, by = CURRENT_USER_ID) =>
  history.push({ id: `h-${history.length + 1}`, at: iso(offset), by, kind, itemId, unitId, action, detail });

  // Registration history
  items.forEach((it) => addHistory(it.kind, it.id, undefined, 'Registered', `${it.units.length} ${it.units.length === 1 ? 'record' : 'records'} added`, -120));

  const assign = (itemId: string, unitIdx: number, to: { emp?: string; item?: string; unit?: number }, ago: number, notes?: string, returnedAgo?: number, returnNotes?: string) => {
    const it = itemById(itemId);
    const u = it.units[unitIdx];
    const a: Assignment = {
      id: `as-${assignments.length + 1}`,
      kind: it.kind,
      itemId,
      unitId: u.id,
      toEmployeeId: to.emp,
      toItemId: to.item,
      toUnitId: to.item !== undefined && to.unit !== undefined ? itemById(to.item).units[to.unit].id : undefined,
      assignedAt: iso(-ago),
      assignedBy: CURRENT_USER_ID,
      notes
    };
    const target = to.emp ? employees.find((e) => e.id === to.emp)?.name : `${itemById(to.item!).units[to.unit!].tag}`;
    addHistory(it.kind, itemId, u.id, 'Assigned', `${u.tag} assigned to ${target}`, -ago);
    if (returnedAgo !== undefined) {
      a.returnedAt = iso(-returnedAgo);
      a.returnedBy = CURRENT_USER_ID;
      a.returnNotes = returnNotes ?? 'Returned in good condition';
      a.condition = 'Good';
      addHistory(it.kind, itemId, u.id, 'Returned', `${u.tag} returned by ${target}`, -returnedAgo);
    } else {
      u.assignmentId = a.id;
      if (it.kind !== 'asset') u.state = it.kind === 'license' && it.reassignable === false ? 'activated' : 'assigned';
    }
    assignments.push(a);
  };

  // Laptops
  assign('ast-1', 0, { emp: 'emp-02' }, 110, 'Issued on joining');
  assign('ast-1', 1, { emp: 'emp-07' }, 90);
  assign('ast-1', 2, { emp: 'emp-11' }, 70);
  assign('ast-2', 0, { emp: 'emp-01' }, 100);
  assign('ast-2', 1, { emp: 'emp-03' }, 95);
  assign('ast-2', 2, { emp: 'emp-04' }, 80);
  assign('ast-2', 3, { emp: 'emp-05' }, 60);
  assign('ast-2', 4, { emp: 'emp-08' }, 45, undefined, 10, 'Replaced with a newer unit');
  assign('ast-3', 0, { emp: 'emp-09' }, 200);
  assign('ast-3', 1, { emp: 'emp-12' }, 150);
  assign('ast-3', 2, { emp: 'emp-06' }, 130);
  assign('ast-4', 0, { emp: 'emp-05' }, 300);
  assign('ast-5', 0, { emp: 'emp-02' }, 108);
  assign('ast-5', 1, { emp: 'emp-07' }, 88);
  assign('ast-5', 2, { emp: 'emp-11' }, 68);
  assign('ast-6', 0, { emp: 'emp-06' }, 50);
  assign('ast-6', 1, { emp: 'emp-10' }, 48);
  // Asset-to-asset: the monitor is installed at the front-office desktop
  assign('ast-5', 3, { item: 'ast-4', unit: 1 }, 40, 'Mounted at reception');
  // Licenses
  [['emp-02'], ['emp-01'], ['emp-03'], ['emp-04'], ['emp-05'], ['emp-06']].forEach(([e], i) => assign('lic-1', i, { emp: e }, 80 - i));
  assign('lic-2', 0, { emp: 'emp-07' }, 120);
  assign('lic-2', 1, { emp: 'emp-11' }, 60);
  assign('lic-3', 0, { emp: 'emp-02' }, 100);
  assign('lic-3', 1, { emp: 'emp-04' }, 100, undefined, 30);
  ['emp-02', 'emp-04', 'emp-07', 'emp-11', 'emp-01'].forEach((e, i) => assign('lic-4', i, { emp: e }, 60 - i));
  assign('lic-5', 0, { emp: 'emp-09' }, 190);
  assign('lic-5', 1, { emp: 'emp-12' }, 190);
  // Components and accessories
  assign('cmp-1', 0, { item: 'ast-4', unit: 2 }, 70, 'RAM upgrade');
  assign('cmp-1', 1, { item: 'ast-4', unit: 2 }, 70, 'RAM upgrade');
  assign('cmp-2', 0, { emp: 'emp-08' }, 30, 'Spare drive for lab');
  ['emp-02', 'emp-07', 'emp-11', 'emp-04', 'emp-03', 'emp-01'].forEach((e, i) => assign('acc-1', i, { emp: e }, 85 - i));
  ['emp-02', 'emp-07', 'emp-11'].forEach((e, i) => assign('acc-2', i, { emp: e }, 85 - i));
  ['emp-02', 'emp-07'].forEach((e, i) => assign('acc-3', i, { emp: e }, 60 - i));
  ['emp-09', 'emp-12', 'emp-06'].forEach((e, i) => assign('acc-4', i, { emp: e }, 40 - i));
  assign('acc-4', 3, { emp: 'emp-10' }, 35, undefined, 5, 'Ear cushion worn');

  // Status variety on a few units
  const pending = itemById('ast-1').units[4];
  pending.statusLabelId = 'st-qa';
  addHistory('asset', 'ast-1', pending.id, 'Status changed', `${pending.tag} set to Pending QA`, -3);
  const retired = itemById('ast-4').units[3];
  retired.statusLabelId = 'st-ret';
  addHistory('asset', 'ast-4', retired.id, 'Status changed', `${retired.tag} set to Retired`, -20);
  const brokenMon = itemById('ast-5').units[5];
  brokenMon.statusLabelId = 'st-brk';
  addHistory('asset', 'ast-5', brokenMon.id, 'Status changed', `${brokenMon.tag} set to Broken - Not Fixable`, -15);

  // Maintenance: one active repair, one completed in the past
  const repairing = itemById('ast-2').units[5];
  repairing.statusLabelId = 'st-rep';
  maintenance.push({
    id: 'm-1', itemId: 'ast-2', unitId: repairing.id, repairAgentId: 'sup-5',
    maintenanceDate: dateOnly(-6), expectedCompletionDate: dateOnly(4), issueDescription: 'Keyboard not responding after liquid spill',
    notes: 'Quote requested', cost: 18500, status: 'in_progress', assignedAt: iso(-6), assignedBy: CURRENT_USER_ID
  });
  addHistory('asset', 'ast-2', repairing.id, 'Sent for maintenance', `${repairing.tag} sent to Dell Authorised Service Centre`, -6);
  const repaired = itemById('ast-3').units[3];
  maintenance.push({
    id: 'm-2', itemId: 'ast-3', unitId: repaired.id, repairAgentId: 'sup-4',
    maintenanceDate: dateOnly(-75), expectedCompletionDate: dateOnly(-65), issueDescription: 'Battery swelling',
    notes: 'Battery replaced under warranty', cost: 0, status: 'completed', assignedAt: iso(-75), assignedBy: CURRENT_USER_ID,
    completedDate: dateOnly(-68), returnNotes: 'Battery replaced, tested OK'
  });
  addHistory('asset', 'ast-3', repaired.id, 'Sent for maintenance', `${repaired.tag} sent to TechFix Lanka Service Centre`, -75);
  addHistory('asset', 'ast-3', repaired.id, 'Maintenance completed', `${repaired.tag} returned from TechFix Lanka Service Centre`, -68);

  // A license unit that has expired, and a nearing-EOL asset for the dashboard
  itemById('ast-4').units[0].eolDate = dateOnly(6);
  itemById('ast-7').units[0].eolDate = dateOnly(22);

  history.sort((a, b) => b.at.localeCompare(a.at));

  return {
    companies,
    departments,
    categories,
    manufacturers,
    suppliers,
    models,
    assetTypes,
    statusLabels,
    customFields,
    fieldSets,
    employees,
    items,
    assignments,
    maintenance,
    history
  };
}

export type { UnitState };
