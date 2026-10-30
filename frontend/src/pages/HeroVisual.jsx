import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, ShieldCheck, Droplet, AlertTriangle, Clock3, ScanLine, Fingerprint } from 'lucide-react';

/** Decorative QR-like matrix (not a real code) for the product illustration. */
function MiniQr({ size = 92 }) {
  const cells = useMemo(() => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const n = 21;
    const out = [];
    const finder = (x, y) => [[0, 0], [n - 7, 0], [0, n - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!finder(x, y) && rnd() > 0.52) out.push([x, y]);
    return out;
  }, []);
  const Finder = ({ x, y }) => (
    <g transform={`translate(${x} ${y})`}>
      <rect width="7" height="7" rx="1.4" fill="#142B45" />
      <rect x="1" y="1" width="5" height="5" rx="1" fill="#fff" />
      <rect x="2" y="2" width="3" height="3" rx="0.6" fill="#142B45" />
    </g>
  );
  return (
    <svg viewBox="-1 -1 23 23" width={size} height={size} aria-hidden="true">
      <rect x="-1" y="-1" width="23" height="23" rx="2" fill="#fff" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 0.08} y={y + 0.08} width="0.84" height="0.84" rx="0.2" fill="#142B45" />
      ))}
      <Finder x={0} y={0} />
      <Finder x={14} y={0} />
      <Finder x={0} y={14} />
    </svg>
  );
}

function Countdown() {
  const [s, setS] = useState(292);
  useEffect(() => {
    const id = setInterval(() => setS((v) => (v <= 1 ? 300 : v - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="tabular">
      {String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}
    </span>
  );
}

const enter = (delay) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
});

export default function HeroVisual() {
  return (
    <div className="relative mx-auto h-[500px] w-full max-w-[560px] sm:h-[520px]" aria-label="Illustration of QR identification, secure verification and authorized access">
      {/* Flow rail */}
      <motion.div {...enter(0.1)} className="absolute left-1/2 top-0 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-white/95 p-1 text-[11px] font-semibold shadow-[var(--shadow-raised)] backdrop-blur">
        {[['Identify', ScanLine], ['Verify', Fingerprint], ['Disclose', ShieldCheck]].map(([label, Icon], i) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${i === 2 ? 'bg-brand-600 text-white' : 'text-muted'}`}>
              <Icon className="size-3" />
              {label}
            </span>
            {i < 2 && <span className="h-px w-3 bg-line-strong" />}
          </span>
        ))}
      </motion.div>

      {/* 1 — Emergency QR card */}
      <motion.div {...enter(0.2)} className="absolute left-0 top-14 z-10 w-[230px] rotate-[-3deg] rounded-2xl bg-navy-800 p-4 text-white shadow-[var(--shadow-pop)] sm:left-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-300">Emergency ID</span>
          <span className="flex size-5 items-center justify-center rounded bg-white/10 text-[10px]">✚</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="rounded-lg bg-white p-1.5"><MiniQr size={78} /></div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] leading-4 text-white/90">EA-7KQ2<br />M9XD-4TPR<br />H3VB</p>
            <p className="mt-2 text-[10px] leading-4 text-white/50">Contains no<br />medical data</p>
          </div>
        </div>
      </motion.div>

      {/* 2 — Verification */}
      <motion.div {...enter(0.35)} className="absolute right-0 top-24 z-10 w-[250px] rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-pop)] sm:right-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-600/15"><Lock className="size-3.5" /></span>
          <div>
            <p className="text-[12px] font-semibold text-ink">Break-glass request</p>
            <p className="text-[10px] text-muted">Paramedic · MH-PARA-10231</p>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-canvas px-2.5 py-2 text-[11px] text-ink ring-1 ring-line">
          <span className="text-muted">Reason · </span>Patient unconscious
        </div>
        <div className="mt-3 flex gap-1.5">
          {['4', '8', '2', '9', '1', '3'].map((d, i) => (
            <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 + i * 0.08 }} className="tabular flex h-8 flex-1 items-center justify-center rounded-md border border-brand-200 bg-brand-50/60 text-[13px] font-semibold text-brand-800">
              {d}
            </motion.span>
          ))}
        </div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
          <Check className="size-3.5" strokeWidth={3} /> Identity and role verified
        </motion.p>
      </motion.div>

      {/* 3 — Authorized disclosure */}
      <motion.div {...enter(0.5)} className="absolute bottom-0 left-1/2 z-20 w-[330px] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-pop)] sm:w-[360px]">
        <div className="flex items-center justify-between border-b border-line bg-canvas/70 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-emerald-500" /></span>
            <span className="text-[11px] font-semibold text-ink">Authorized · Paramedic view</span>
          </div>
          <span className="flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-semibold text-ink ring-1 ring-line">
            <Clock3 className="size-3 text-brand-600" /> <Countdown />
          </span>
        </div>
        <div className="grid grid-cols-[86px_1fr] gap-3 p-4">
          <div className="flex flex-col items-center justify-center rounded-xl bg-red-50/70 py-3 ring-1 ring-red-600/10">
            <Droplet className="size-4 text-red-600" />
            <p className="mt-1 text-[22px] font-semibold leading-none text-ink">O+</p>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-muted">Blood</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] ring-1 ring-amber-600/15">
              <AlertTriangle className="size-3.5 shrink-0 text-amber-700" />
              <span className="font-semibold text-ink">Penicillin</span>
              <span className="ml-auto text-[10px] font-medium text-amber-800">Anaphylaxis</span>
            </div>
            <div className="rounded-lg px-2.5 py-1.5 text-[11px] ring-1 ring-line"><span className="font-semibold text-ink">Type 1 diabetes</span><span className="text-muted"> · Critical</span></div>
            <div className="rounded-lg px-2.5 py-1.5 text-[11px] ring-1 ring-line"><span className="font-semibold text-ink">Insulin</span><span className="text-muted"> · check glucose</span></div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-t border-dashed border-line px-4 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Withheld</span>
          {['Full history', 'All medications', 'Minor conditions'].map((t) => (
            <span key={t} className="flex items-center gap-1 rounded bg-ink/[0.04] px-1.5 py-0.5 text-[10px] text-muted"><Lock className="size-2.5" />{t}</span>
          ))}
        </div>
      </motion.div>

      {/* connector lines */}
      <svg className="pointer-events-none absolute inset-0 -z-0 hidden size-full sm:block" aria-hidden="true">
        <motion.path d="M 150 210 C 180 300, 220 300, 250 330" stroke="#a7dce2" strokeWidth="1.5" strokeDasharray="4 5" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.7, duration: 0.8 }} />
        <motion.path d="M 430 290 C 420 320, 380 320, 340 330" stroke="#a7dce2" strokeWidth="1.5" strokeDasharray="4 5" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1, duration: 0.8 }} />
      </svg>
    </div>
  );
}

export { MiniQr };
