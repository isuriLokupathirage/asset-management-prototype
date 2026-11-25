import React from 'react';
import { Button } from './Button';
import { ModalHeader, ModalShell } from './Modal';

/**
 * Modal with a fixed header and footer, used by every create / edit / action form.
 * (Named FormDrawer from an earlier iteration; the current Asset Management screens use modals.)
 */
export function FormDrawer({
  open,
  title,
  subtitle,
  onClose,
  onSubmit,
  submitLabel = 'Save',
  busy,
  size = 'md',
  children,
  submitVariant = 'primary',
  hideSubmit
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  busy?: boolean;
  /** `lg` for forms with many fields, such as a new asset. */
  size?: 'md' | 'lg';
  children: React.ReactNode;
  submitVariant?: 'primary' | 'danger';
  hideSubmit?: boolean;
}) {
  return (
    <ModalShell open={open} label={title} onClose={onClose} size={size === 'lg' ? 'lg' : 'md'}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}>
        <ModalHeader title={title} subtitle={subtitle} onClose={onClose} />
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-4">{children}</div>
        <div className="flex justify-end gap-2 px-6 pb-5 pt-3">
          <Button type="button" onClick={onClose} disabled={busy}>{hideSubmit ? 'Close' : 'Cancel'}</Button>
          {!hideSubmit &&
          <Button type="submit" variant={submitVariant} disabled={busy}>{busy ? 'Working...' : submitLabel}</Button>
          }
        </div>
      </form>
    </ModalShell>);

}

export function FormSection({ title, description, children }: {title: string;description?: string;children: React.ReactNode;}) {
  return (
    <section className="mb-6 last:mb-0">
      <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-0.5 text-[12px] text-muted">{description}</p>}
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>);

}

/** A field wrapper with label and an inline validation message. */
export function Labeled({
  label,
  required,
  error,
  hint,
  wide,
  children
}: {label: string;required?: boolean;error?: string;hint?: string;wide?: boolean;children: React.ReactNode;}) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <label className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-[12px] text-red-600">{error}</p>}
    </div>);

}
