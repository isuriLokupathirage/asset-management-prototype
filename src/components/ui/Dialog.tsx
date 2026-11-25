import React from 'react';
import { Button } from './Button';
import { ModalHeader, ModalShell } from './Modal';

/** Confirmation dialog. */
export function Dialog({
  open,
  title,
  body,
  confirmLabel = 'Submit',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
  confirmDisabled = false,
  busy = false
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmVariant?: 'primary' | 'danger';
  confirmDisabled?: boolean;
  size?: 'md' | 'lg';
  busy?: boolean;
}) {
  return (
    <ModalShell open={open} label={title} onClose={onCancel} size="sm">
      <ModalHeader title={title} onClose={onCancel} />
      <div className="px-6 pb-2 text-sm leading-relaxed text-muted">{body}</div>
      <div className="flex justify-end gap-2 px-6 pb-5 pt-4">
        <Button onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={confirmDisabled || busy}>
          {busy ? 'Working...' : confirmLabel}
        </Button>
      </div>
    </ModalShell>);

}
