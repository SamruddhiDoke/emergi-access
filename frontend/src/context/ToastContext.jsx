import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle2, tone: 'text-emerald-600' },
  error: { icon: XCircle, tone: 'text-red-600' },
  warning: { icon: AlertTriangle, tone: 'text-amber-600' },
  info: { icon: Info, tone: 'text-brand-600' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (type, title, description) => {
      const id = crypto.randomUUID();
      setToasts((t) => [...t.slice(-3), { id, type, title, description }]);
      setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4500);
    },
    [dismiss],
  );

  const toast = useMemo(
    () => ({
      success: (t, d) => push('success', t, d),
      error: (t, d) => push('error', t, d),
      warning: (t, d) => push('warning', t, d),
      info: (t, d) => push('info', t, d),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const { icon: Icon, tone } = STYLES[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-white p-3.5 pr-3 shadow-[var(--shadow-pop)]"
                role="status"
              >
                <Icon className={`mt-0.5 size-[18px] shrink-0 ${tone}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-[13px] leading-5 text-muted">{t.description}</p>}
                </div>
                <button onClick={() => dismiss(t.id)} className="rounded-md p-1 text-subtle hover:bg-canvas hover:text-ink" aria-label="Dismiss">
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
