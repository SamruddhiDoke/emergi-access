import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  useEscape(open, onClose);
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-navy-950/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={`relative w-full ${widths[size]} max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white shadow-[var(--shadow-pop)] sm:rounded-2xl`}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-5">
              <div>
                <h2 id="modal-title" className="text-base font-semibold text-ink">{title}</h2>
                {description && <p className="mt-1 text-[13px] leading-5 text-muted">{description}</p>}
              </div>
              <button onClick={onClose} className="-mr-2 rounded-lg p-1.5 text-subtle hover:bg-canvas hover:text-ink" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
            {footer && <div className="flex flex-col-reverse gap-2 border-t border-line bg-canvas/60 px-6 py-4 sm:flex-row sm:justify-end">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', tone = 'danger', loading, children }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2.5">
          <span className={`flex size-8 items-center justify-center rounded-lg ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700'}`}>
            <AlertTriangle className="size-4" />
          </span>
          {title}
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      {description && <p className="text-sm leading-6 text-muted">{description}</p>}
      {children}
    </Modal>
  );
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-xl' }) {
  useEscape(open, onClose);
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex justify-end">
          <motion.div className="absolute inset-0 bg-navy-950/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%', transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 360, damping: 38 }}
            className={`relative flex h-full w-full ${width} flex-col bg-white shadow-[var(--shadow-pop)]`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-ink">{title}</h2>
                {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="-mr-2 rounded-lg p-1.5 text-subtle hover:bg-canvas hover:text-ink" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="border-t border-line bg-canvas/60 px-6 py-4">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Lightweight dropdown menu. `items`: [{ label, icon, onClick, tone, divider }] */
export function Dropdown({ trigger, items, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
            transition={{ duration: 0.14 }}
            className={`absolute z-50 mt-1.5 min-w-48 rounded-xl border border-line bg-white p-1 shadow-[var(--shadow-pop)] ${align === 'right' ? 'right-0' : 'left-0'} ${align === 'up' ? 'bottom-full mb-1.5 left-0 right-0' : ''}`}
            role="menu"
          >
            {items.map((item, i) =>
              item.divider ? (
                <div key={i} className="my-1 h-px bg-line" />
              ) : item.header ? (
                <div key={i} className="px-2.5 py-2">{item.header}</div>
              ) : (
                <button
                  key={i}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium ${item.tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-ink hover:bg-canvas'}`}
                >
                  {item.icon && <item.icon className="size-4 opacity-70" />}
                  {item.label}
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
