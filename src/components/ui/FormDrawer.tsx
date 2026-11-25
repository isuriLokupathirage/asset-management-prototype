import React from 'react';
import { XIcon } from 'lucide-react';
import { Drawer } from './Drawer';
import { Button } from './Button';

/** Drawer with a fixed header and footer, used by every create / edit / action form. */
export function FormDrawer({
  open,
  title,
  subtitle,
  onClose,
  onSubmit,
  submitLabel = 'Save',
  busy,
  size,
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
  size?: 'md' | 'lg';
  children: React.ReactNode;
  submitVariant?: 'primary' | 'danger';
  hideSubmit?: boolean;
}) {
  return (
    <Drawer open={open} label={title} onClose={onClose} size={size}>
      <form
        className="flex h-full min-h-0 flex-col"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-subtle hover:bg-slate-100 hover:text-ink">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-line px-6 py-3.5">
          <Button type="button" onClick={onClose} disabled={busy}>{hideSubmit ? 'Close' : 'Cancel'}</Button>
          {!hideSubmit &&
          <Button type="submit" variant={submitVariant} disabled={busy}>{busy ? 'Working...' : submitLabel}</Button>
          }
        </div>
      </form>
    </Drawer>);

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
