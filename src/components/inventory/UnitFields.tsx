import type { Db, Kind } from '../../types';
import type { UnitInput } from '../../services/domain';
import { Checkbox, Input, Select, Textarea } from '../ui/Field';
import { Labeled } from '../ui/FormDrawer';
import { toDateInput } from '../../utils/format';

export const blankUnit = (kind: Kind, db: Db, tag = ''): UnitInput => ({
  tag,
  serial: '',
  licenseKey: '',
  statusLabelId: kind === 'asset' ? db.statusLabels.find((s) => s.statusType === 'Deployable')?.id : undefined,
  state: 'available',
  condition: kind === 'component' || kind === 'accessory' ? 'New' : undefined,
  customValues: {}
});

export const CONDITIONS = ['New', 'Good', 'Fair', 'Worn'];

/** The fields of one individual asset / seat / component / accessory. */
export function UnitFields({
  kind,
  db,
  value,
  onChange,
  errors = {},
  fieldsetId,
  compact,
  statusEditable = true
}: {
  kind: Kind;
  db: Db;
  value: UnitInput;
  onChange: (next: UnitInput) => void;
  errors?: Record<string, string>;
  fieldsetId?: string;
  compact?: boolean;
  /** Existing assets change status through the status action, not the edit form. */
  statusEditable?: boolean;
}) {
  const set = (patch: Partial<UnitInput>) => onChange({ ...value, ...patch });
  const customFields = kind === 'asset' && fieldsetId ? db.customFields.filter((f) => f.fieldsetIds.includes(fieldsetId)) : [];
  const setCustom = (id: string, v: string) => set({ customValues: { ...value.customValues, [id]: v } });

  return (
    <div className={`grid gap-4 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
      <Labeled label={kind === 'asset' ? 'Asset tag' : 'Tag'} required error={errors.tag}>
        <Input value={value.tag} onChange={(e) => set({ tag: e.target.value })} placeholder="e.g. LAP-014" />
      </Labeled>
      {kind === 'license' ?
      <Labeled label="License key" required error={errors.licenseKey}>
          <Input value={value.licenseKey ?? ''} onChange={(e) => set({ licenseKey: e.target.value })} placeholder="XXXX-XXXX-XXXX" />
        </Labeled> :
      <Labeled label="Serial number" error={errors.serial}>
          <Input value={value.serial ?? ''} onChange={(e) => set({ serial: e.target.value })} />
        </Labeled>
      }
      {kind === 'asset' && statusEditable &&
      <Labeled label="Status" required error={errors.statusLabelId}>
          <Select value={value.statusLabelId ?? ''} onChange={(e) => set({ statusLabelId: e.target.value })}>
            <option value="">Select status</option>
            {db.statusLabels.filter((s) => s.statusType !== 'Under Maintenance').map((s) =>
          <option key={s.id} value={s.id}>{s.name} ({s.statusType})</option>
          )}
          </Select>
        </Labeled>
      }
      {kind === 'asset' &&
      <>
          <Labeled label="Warranty expiry">
            <Input type="date" value={toDateInput(value.warrantyExpiry)} onChange={(e) => set({ warrantyExpiry: e.target.value })} />
          </Labeled>
          <Labeled label="End of life (EOL) date">
            <Input type="date" value={toDateInput(value.eolDate)} onChange={(e) => set({ eolDate: e.target.value })} />
          </Labeled>
        </>
      }
      {kind === 'license' &&
      <Labeled label="Expiration date">
          <Input type="date" value={toDateInput(value.expirationDate)} onChange={(e) => set({ expirationDate: e.target.value })} />
        </Labeled>
      }
      {(kind === 'component' || kind === 'accessory') &&
      <>
          <Labeled label="Condition">
            <Select value={value.condition ?? 'New'} onChange={(e) => set({ condition: e.target.value })}>
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Labeled>
          <Labeled label="Warranty expiry">
            <Input type="date" value={toDateInput(value.warrantyExpiry)} onChange={(e) => set({ warrantyExpiry: e.target.value })} />
          </Labeled>
        </>
      }
      {customFields.map((f) =>
      <Labeled key={f.id} label={f.fieldName} required={f.required} error={errors[`cf-${f.id}`]}>
          {f.formElement === 'select' || f.formElement === 'radio_buttons' ?
        <Select value={value.customValues?.[f.id] ?? ''} onChange={(e) => setCustom(f.id, e.target.value)}>
              <option value="">Select</option>
              {f.options.map((o) => <option key={o}>{o}</option>)}
            </Select> :
        f.formElement === 'check_box' ?
        <Checkbox label="Yes" checked={value.customValues?.[f.id] === 'true'} onChange={(e) => setCustom(f.id, String(e.target.checked))} /> :
        f.formElement === 'text_area' ?
        <Textarea value={value.customValues?.[f.id] ?? ''} onChange={(e) => setCustom(f.id, e.target.value)} /> :
        <Input value={value.customValues?.[f.id] ?? ''} onChange={(e) => setCustom(f.id, e.target.value)} />}
        </Labeled>
      )}
      {!compact &&
      <>
          <Labeled label="Notes" wide>
            <Textarea value={value.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
          </Labeled>
          <Labeled label="Internal notes" hint="Visible to asset managers only">
            <Textarea value={value.internalNotes ?? ''} onChange={(e) => set({ internalNotes: e.target.value })} />
          </Labeled>
          <Labeled label="Handover notes" hint="Printed on the handover form">
            <Textarea value={value.handoverNotes ?? ''} onChange={(e) => set({ handoverNotes: e.target.value })} />
          </Labeled>
        </>
      }
    </div>);

}

/** Validates the fields of one unit; returns messages keyed by field. */
export function validateUnitForm(kind: Kind, db: Db, u: UnitInput, fieldsetId?: string, statusEditable = true): Record<string, string> {
  const e: Record<string, string> = {};
  if (!u.tag.trim()) e.tag = 'Tag is required';
  if (kind === 'asset' && statusEditable && !u.statusLabelId) e.statusLabelId = 'Status is required';
  if (kind === 'license' && !u.licenseKey?.trim()) e.licenseKey = 'License key is required';
  if (kind === 'asset' && fieldsetId) {
    db.customFields.filter((f) => f.fieldsetIds.includes(fieldsetId) && f.required).forEach((f) => {
      if (!u.customValues?.[f.id]) e[`cf-${f.id}`] = `${f.fieldName} is required`;
    });
  }
  return e;
}
