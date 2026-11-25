import { useEffect, useMemo, useState } from 'react';
import { PlusIcon, SparklesIcon, Trash2Icon, UploadIcon } from 'lucide-react';
import type { Item, Kind } from '../../types';
import { kindLabel } from '../../types';
import { useStore } from '../../store/AppStore';
import { createItem, generateTags, updateItem, type ItemInput, type UnitInput } from '../../services/domain';
import { FormDrawer, FormSection, Labeled } from '../ui/FormDrawer';
import { Checkbox, Input, Textarea } from '../ui/Field';
import { Button } from '../ui/Button';
import { SearchableSelect } from '../ui/SearchableSelect';
import { blankUnit, UnitFields, validateUnitForm } from './UnitFields';
import { toDateInput } from '../../utils/format';

interface Form {
  name: string;
  companyId: string;
  departmentId: string;
  modelId: string;
  categoryId: string;
  manufacturerId: string;
  assetTypeId: string;
  modelNumber: string;
  supplierId: string;
  orderNumber: string;
  purchaseOrderNumber: string;
  cost: string;
  purchaseDate: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceFileName: string;
  minQty: string;
  notes: string;
  licensedToName: string;
  licensedToEmail: string;
  reassignable: boolean;
  maintained: boolean;
  terminationDate: string;
}

const fromItem = (i?: Item): Form => ({
  name: i?.name ?? '',
  companyId: i?.companyId ?? '',
  departmentId: i?.departmentId ?? '',
  modelId: i?.modelId ?? '',
  categoryId: i?.categoryId ?? '',
  manufacturerId: i?.manufacturerId ?? '',
  assetTypeId: i?.assetTypeId ?? '',
  modelNumber: i?.modelNumber ?? '',
  supplierId: i?.supplierId ?? '',
  orderNumber: i?.orderNumber ?? '',
  purchaseOrderNumber: i?.purchaseOrderNumber ?? '',
  cost: i?.cost !== undefined ? String(i.cost) : '',
  purchaseDate: toDateInput(i?.purchaseDate),
  invoiceNumber: i?.invoiceNumber ?? '',
  invoiceDate: toDateInput(i?.invoiceDate),
  invoiceFileName: i?.invoiceFileName ?? '',
  minQty: String(i?.minQty ?? 1),
  notes: i?.notes ?? '',
  licensedToName: i?.licensedToName ?? '',
  licensedToEmail: i?.licensedToEmail ?? '',
  reassignable: i?.reassignable ?? true,
  maintained: i?.maintained ?? false,
  terminationDate: toDateInput(i?.terminationDate)
});

const costLabel: Record<Kind, string> = {
  asset: 'Total purchase cost (LKR)',
  license: 'Purchase cost (LKR)',
  component: 'Unit cost (LKR)',
  accessory: 'Unit cost (LKR)'
};

export function ItemFormDrawer({ kind, item, open, onClose, onSaved }: {kind: Kind;item?: Item;open: boolean;onClose: () => void;onSaved?: (id: string) => void;}) {
  const { db, run, busy } = useStore();
  const editing = Boolean(item);
  const [form, setForm] = useState<Form>(() => fromItem(item));
  const [units, setUnits] = useState<UnitInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [unitErrors, setUnitErrors] = useState<Array<Record<string, string>>>([]);

  useEffect(() => {
    if (!open) return;
    setForm(fromItem(item));
    setErrors({});
    setUnitErrors([]);
    setUnits(item ? [] : [blankUnit(kind, db)]);
    // Reset only when the drawer is opened for a record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id, kind]);

  const set = <K extends keyof Form,>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const model = db.models.find((m) => m.id === form.modelId);
  const departments = db.departments.filter((d) => !form.companyId || d.companyId === form.companyId);
  const types = db.assetTypes.filter((t) => t.kind === kind && (!form.companyId || t.companyId === form.companyId));
  const suppliers = db.suppliers.filter((s) => s.type.includes('supplier'));

  const companyOptions = useMemo(() => db.companies.map((c) => ({ value: c.id, label: c.name })), [db.companies]);

  const autoTags = () => {
    if (!form.assetTypeId) {
      setErrors((e) => ({ ...e, assetTypeId: 'Select an asset type to generate tags from its pattern' }));
      return;
    }
    const existing = units.map((u) => u.tag).filter(Boolean);
    const blanks = units.filter((u) => !u.tag.trim()).length;
    const fresh = generateTags(db, form.assetTypeId, blanks, existing);
    setUnits((us) => {
      let n = 0;
      return us.map((u) => u.tag.trim() ? u : { ...u, tag: fresh[n++] ?? '' });
    });
  };

  const setQuantity = (qty: number) => {
    const q = Math.max(1, Math.min(200, qty || 1));
    setUnits((us) => q >= us.length ? [...us, ...Array.from({ length: q - us.length }, () => blankUnit(kind, db))] : us.slice(0, q));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = `${kindLabel[kind]} name is required`;
    if (!form.companyId) e.companyId = 'Company is required';
    if (kind === 'asset') {
      if (!form.modelId) e.modelId = 'Model is required';
      if (!form.departmentId) e.departmentId = 'Department is required';
    }
    if (kind !== 'asset' && (!form.minQty || Number(form.minQty) < 0)) e.minQty = 'Enter a minimum quantity of 0 or more';
    if (form.cost && Number(form.cost) < 0) e.cost = 'Cost cannot be negative';
    if (kind === 'license' && form.licensedToEmail && !/^\S+@\S+\.\S+$/.test(form.licensedToEmail)) e.licensedToEmail = 'Enter a valid email address';
    setErrors(e);
    let ue: Array<Record<string, string>> = [];
    if (!editing) ue = units.map((u) => validateUnitForm(kind, db, u, model?.fieldsetId));
    setUnitErrors(ue);
    return Object.keys(e).length === 0 && ue.every((x) => Object.keys(x).length === 0);
  };

  const submit = async () => {
    if (!validate()) return;
    const input: ItemInput = {
      name: form.name,
      companyId: form.companyId,
      departmentId: kind === 'asset' ? form.departmentId : undefined,
      modelId: kind === 'asset' ? form.modelId : undefined,
      categoryId: kind === 'asset' ? model?.categoryId : form.categoryId || undefined,
      manufacturerId: kind === 'asset' ? model?.manufacturerId : form.manufacturerId || undefined,
      assetTypeId: form.assetTypeId || undefined,
      modelNumber: kind === 'component' || kind === 'accessory' ? form.modelNumber || undefined : undefined,
      supplierId: form.supplierId || undefined,
      orderNumber: form.orderNumber || undefined,
      purchaseOrderNumber: kind === 'license' ? form.purchaseOrderNumber || undefined : undefined,
      cost: form.cost ? Number(form.cost) : undefined,
      purchaseDate: form.purchaseDate || undefined,
      invoiceNumber: form.invoiceNumber || undefined,
      invoiceDate: form.invoiceDate || undefined,
      invoiceFileName: form.invoiceFileName || undefined,
      minQty: kind === 'asset' ? model?.minQty ?? 1 : Number(form.minQty),
      notes: form.notes || undefined,
      licensedToName: kind === 'license' ? form.licensedToName || undefined : undefined,
      licensedToEmail: kind === 'license' ? form.licensedToEmail || undefined : undefined,
      reassignable: kind === 'license' ? form.reassignable : undefined,
      maintained: kind === 'license' ? form.maintained : undefined,
      terminationDate: kind === 'license' ? form.terminationDate || undefined : undefined
    };
    const cleanUnits = units.map((u) => ({ ...u, serial: u.serial?.trim() || undefined, licenseKey: u.licenseKey?.trim() || undefined }));
    if (item) {
      const r = await run((d) => updateItem(d, item.id, { ...input, minQty: input.minQty }), `${kindLabel[kind]} updated`);
      if (r.ok) {
        onSaved?.(item.id);
        onClose();
      }
    } else {
      const r = await run((d) => {
        const out = createItem(d, kind, input, cleanUnits);
        return { db: out.db, result: out.item.id };
      }, `${kindLabel[kind]} created`);
      if (r.ok) {
        onSaved?.(r.result as string);
        onClose();
      }
    }
  };

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
      size="lg"
      title={editing ? `Edit ${kindLabel[kind].toLowerCase()}` : `Add ${kindLabel[kind].toLowerCase()}`}
      subtitle={editing ? item?.name : kind === 'license' ? 'Register a license and its seats' : `Register a new ${kindLabel[kind].toLowerCase()} and its individual records`}
      submitLabel={editing ? 'Save changes' : `Create ${kindLabel[kind].toLowerCase()}`}>
      <FormSection title="Basic information">
        <Labeled label={kind === 'license' ? 'Software name' : `${kindLabel[kind]} name`} required error={errors.name} wide>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={kind === 'asset' ? 'e.g. Dell Latitude 5440 - General' : ''} />
        </Labeled>
        <Labeled label="Company" required error={errors.companyId}>
          <SearchableSelect
            value={form.companyId}
            options={companyOptions}
            placeholder="Select company"
            invalid={Boolean(errors.companyId)}
            onChange={(v) => setForm((f) => ({ ...f, companyId: v, departmentId: '', assetTypeId: '' }))} />
        </Labeled>
        {kind === 'asset' &&
        <Labeled label="Department" required error={errors.departmentId}>
            <SearchableSelect
            value={form.departmentId}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            placeholder={form.companyId ? 'Select department' : 'Select a company first'}
            disabled={!form.companyId}
            onChange={(v) => set('departmentId', v)}
            invalid={Boolean(errors.departmentId)} />
          </Labeled>
        }
        {kind === 'asset' &&
        <Labeled label="Model" required error={errors.modelId} hint={model ? `${db.categories.find((c) => c.id === model.categoryId)?.name ?? ''} · ${db.manufacturers.find((m) => m.id === model.manufacturerId)?.name ?? ''}` : undefined}>
            <SearchableSelect
            value={form.modelId}
            options={db.models.map((m) => ({ value: m.id, label: m.name, hint: m.modelNo }))}
            placeholder="Select model"
            onChange={(v) => set('modelId', v)}
            invalid={Boolean(errors.modelId)} />
          </Labeled>
        }
        {kind !== 'asset' &&
        <>
            <Labeled label="Category">
              <SearchableSelect clearable value={form.categoryId} options={db.categories.filter((c) => !c.type || c.type === kind).map((c) => ({ value: c.id, label: c.name }))} placeholder="Select category" onChange={(v) => set('categoryId', v)} />
            </Labeled>
            <Labeled label="Manufacturer">
              <SearchableSelect clearable value={form.manufacturerId} options={db.manufacturers.map((m) => ({ value: m.id, label: m.name }))} placeholder="Select manufacturer" onChange={(v) => set('manufacturerId', v)} />
            </Labeled>
            <Labeled label="Minimum quantity" required error={errors.minQty} hint="A low-stock warning is shown when availability drops below this">
              <Input type="number" min={0} value={form.minQty} onChange={(e) => set('minQty', e.target.value)} />
            </Labeled>
          </>
        }
        {(kind === 'component' || kind === 'accessory') &&
        <Labeled label="Model number">
            <Input value={form.modelNumber} onChange={(e) => set('modelNumber', e.target.value)} />
          </Labeled>
        }
        <Labeled label="Asset type" error={errors.assetTypeId} hint="Controls the tag pattern, for example LAP-XXX">
          <SearchableSelect clearable value={form.assetTypeId} options={types.map((t) => ({ value: t.id, label: t.name, hint: t.pattern }))} placeholder={form.companyId ? 'Select asset type' : 'Select a company first'} disabled={!form.companyId} onChange={(v) => set('assetTypeId', v)} />
        </Labeled>
      </FormSection>

      {kind === 'license' &&
      <FormSection title="Licensing">
          <Labeled label="Licensed to name">
            <Input value={form.licensedToName} onChange={(e) => set('licensedToName', e.target.value)} />
          </Labeled>
          <Labeled label="Licensed to email" error={errors.licensedToEmail}>
            <Input type="email" value={form.licensedToEmail} onChange={(e) => set('licensedToEmail', e.target.value)} />
          </Labeled>
          <Labeled label="Termination date">
            <Input type="date" value={form.terminationDate} onChange={(e) => set('terminationDate', e.target.value)} />
          </Labeled>
          <div className="space-y-3 self-end pb-2">
            <Checkbox label="Reassignable" description="A returned seat can be assigned again" checked={form.reassignable} onChange={(e) => set('reassignable', e.target.checked)} />
            <Checkbox label="Maintained" description="Covered by a maintenance / support plan" checked={form.maintained} onChange={(e) => set('maintained', e.target.checked)} />
          </div>
        </FormSection>
      }

      <FormSection title="Order and invoice">
        <Labeled label="Supplier">
          <SearchableSelect clearable value={form.supplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} placeholder="Select supplier" onChange={(v) => set('supplierId', v)} />
        </Labeled>
        <Labeled label="Order number">
          <Input value={form.orderNumber} onChange={(e) => set('orderNumber', e.target.value)} />
        </Labeled>
        {kind === 'license' &&
        <Labeled label="Purchase order number">
            <Input value={form.purchaseOrderNumber} onChange={(e) => set('purchaseOrderNumber', e.target.value)} />
          </Labeled>
        }
        <Labeled label={costLabel[kind]} error={errors.cost}>
          <Input type="number" min={0} value={form.cost} onChange={(e) => set('cost', e.target.value)} />
        </Labeled>
        <Labeled label="Purchase date">
          <Input type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} />
        </Labeled>
        <Labeled label="Invoice number">
          <Input value={form.invoiceNumber} onChange={(e) => set('invoiceNumber', e.target.value)} />
        </Labeled>
        <Labeled label="Invoice date">
          <Input type="date" value={form.invoiceDate} onChange={(e) => set('invoiceDate', e.target.value)} />
        </Labeled>
        <Labeled label="Invoice file" hint="PDF or image, up to 5 MB (not uploaded in this prototype)">
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line bg-white px-3 text-sm text-muted hover:bg-slate-50">
            <UploadIcon className="h-4 w-4" />
            <span className="truncate">{form.invoiceFileName || 'Choose a file'}</span>
            <input
              type="file"
              accept=".pdf,image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 5 * 1024 * 1024) setErrors((x) => ({ ...x, invoice: 'File size exceeds 5MB limit' }));else
                {
                  setErrors((x) => ({ ...x, invoice: '' }));
                  set('invoiceFileName', f.name);
                }
              }} />
          </label>
          {errors.invoice && <p className="mt-1 text-[12px] text-red-600">{errors.invoice}</p>}
        </Labeled>
        <Labeled label="Notes" wide>
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Labeled>
      </FormSection>

      {!editing &&
      <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-semibold text-ink">{kind === 'license' ? 'Seats' : 'Individual records'}</h3>
              <p className="mt-0.5 text-[12px] text-muted">Each record is tracked, assigned and returned separately.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-muted" htmlFor="qty">Quantity</label>
              <Input id="qty" type="number" min={1} max={200} className="h-9 w-20" value={units.length} onChange={(e) => setQuantity(Number(e.target.value))} />
              <Button size="sm" onClick={autoTags} title="Fill empty tags from the asset type pattern">
                <SparklesIcon className="h-3.5 w-3.5" /> Generate tags
              </Button>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {units.map((u, idx) =>
          <div key={idx} className="rounded-xl border border-line bg-slate-50/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-muted">Record {idx + 1}</p>
                  {units.length > 1 &&
              <button type="button" aria-label={`Remove record ${idx + 1}`} onClick={() => setUnits((us) => us.filter((_, i) => i !== idx))} className="rounded p-1 text-subtle hover:bg-white hover:text-red-600">
                      <Trash2Icon className="h-4 w-4" />
                    </button>
              }
                </div>
                <UnitFields kind={kind} db={db} value={u} compact errors={unitErrors[idx]} fieldsetId={model?.fieldsetId} onChange={(next) => setUnits((us) => us.map((x, i) => i === idx ? next : x))} />
              </div>
          )}
          </div>
          <Button size="sm" className="mt-3" onClick={() => setUnits((us) => [...us, blankUnit(kind, db)])}>
            <PlusIcon className="h-3.5 w-3.5" /> Add another record
          </Button>
        </section>
      }
    </FormDrawer>);

}
