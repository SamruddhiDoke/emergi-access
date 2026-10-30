import { formatCountdown } from '../../utils/format';

/** Circular countdown. Colour shifts to amber in the final minute — display only; the server enforces expiry. */
export function CountdownRing({ remaining, total, size = 76 }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const warn = remaining <= 60;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="timer" aria-label={`${Math.floor(remaining)} seconds remaining`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-ink/[0.07]" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={`transition-[stroke-dashoffset,stroke] duration-300 ${warn ? 'stroke-amber-500' : 'stroke-brand-600'}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`tabular text-[15px] font-semibold leading-none ${warn ? 'text-amber-700' : 'text-ink'}`}>{formatCountdown(remaining)}</span>
        <span className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-subtle">left</span>
      </div>
    </div>
  );
}
