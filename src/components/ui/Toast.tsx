import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircleIcon, CheckCircle2Icon, XIcon } from 'lucide-react';

/** A short message at the bottom right. Errors stay until dismissed; confirmations close themselves. */
export function Toast({ message, onClose, tone = 'success' }: {message: string | null;onClose: () => void;tone?: 'success' | 'error';}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!message || tone === 'error') return undefined;
    const timer = setTimeout(() => closeRef.current(), 4500);
    return () => clearTimeout(timer);
  }, [message, tone]);
  const Icon = tone === 'error' ? AlertCircleIcon : CheckCircle2Icon;
  return (
    <AnimatePresence>
      {message &&
      <motion.div
        role={tone === 'error' ? 'alert' : 'status'}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
        className={`fixed right-6 z-[60] flex max-w-sm items-start gap-2.5 rounded-xl border bg-white px-4 py-3 shadow-pop ${tone === 'error' ? 'bottom-24 border-red-200' : 'bottom-6 border-line'}`}>
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone === 'error' ? 'text-red-600' : 'text-emerald-600'}`} />
          <p className="flex-1 text-[13px] leading-relaxed text-ink">{message}</p>
          <button type="button" aria-label="Dismiss" onClick={onClose} className="rounded p-0.5 text-subtle hover:bg-slate-100 hover:text-ink">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      }
    </AnimatePresence>);

}
