import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';

/** Open modals, topmost last, so Escape only closes the one on top. */
const stack: symbol[] = [];

const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-6xl' } as const;
export type ModalSize = keyof typeof widths;

/** The Backdrop and panel shared by every dialog. Rendered in a portal so modals can open over modals. */
export function ModalShell({
  open,
  label,
  onClose,
  size = 'md',
  children
}: {open: boolean;label: string;onClose: () => void;size?: ModalSize;children: React.ReactNode;}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const id = Symbol('modal');
    stack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === id) closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const i = stack.indexOf(id);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 bg-slate-900/50"
          onClick={onClose} />
          <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 4 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className={`relative flex max-h-[92vh] w-full ${widths[size]} flex-col rounded-xl bg-white shadow-pop`}>
            {children}
          </motion.div>
        </div>
      }
    </AnimatePresence>,
    document.body);

}

export function ModalHeader({ title, subtitle, onClose, actions }: {title: string;subtitle?: string;onClose: () => void;actions?: React.ReactNode;}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-ink hover:bg-slate-100">
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>);

}
