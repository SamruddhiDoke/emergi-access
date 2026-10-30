import { useState } from 'react';
import { ChevronDown, FlaskConical } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export const DEMO_PASSWORD = 'Demo@12345';

const ACCOUNTS = {
  patient: [
    ['Ananya Rao', 'ananya.rao@demo.emergi.in', 'Type 1 diabetes, penicillin allergy'],
    ['Rohan Deshmukh', 'rohan.deshmukh@demo.emergi.in', 'Cardiac, anticoagulated'],
    ['Fatima Shaikh', 'fatima.shaikh@demo.emergi.in', 'Epilepsy'],
  ],
  professional: [
    ['Sameer Patil', 'sameer.patil@demo.emergi.in', 'Paramedic · verified'],
    ['Dr. Neha Joshi', 'neha.joshi@demo.emergi.in', 'Doctor · verified'],
    ['Dr. Vikram Sathe', 'vikram.sathe@demo.emergi.in', 'Specialist · Cardiology'],
    ['Dr. Aditi Kale', 'aditi.kale@demo.emergi.in', 'Doctor · not verified'],
    ['Asha Kulkarni', 'admin@demo.emergi.in', 'Administrator'],
  ],
};

/** Demo-environment helper so evaluators can try each role without typing credentials. */
export function DemoAccounts({ portal, onPick }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-8 rounded-xl border border-dashed border-line-strong">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <FlaskConical className="size-4 text-brand-600" />
          Demo accounts
          <span className="font-normal text-muted">· password {DEMO_PASSWORD}</span>
        </span>
        <ChevronDown className={`size-4 text-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="space-y-0.5 border-t border-dashed border-line-strong p-1.5">
              {ACCOUNTS[portal].map(([name, email, note]) => (
                <li key={email}>
                  <button type="button" onClick={() => onPick(email, DEMO_PASSWORD)} className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-canvas">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-ink">{name}</span>
                      <span className="block truncate text-xs text-muted">{email}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-subtle">{note}</span>
                  </button>
                </li>
              ))}
            </div>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
