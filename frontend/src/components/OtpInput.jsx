import { useEffect, useRef } from 'react';

/** Six-digit one-time-code input with paste support and auto-advance. */
export function OtpInput({ value, onChange, disabled, autoFocus = true, invalid }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const set = (i, d) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join('').slice(0, 6));
  };

  return (
    <div className="flex gap-2 sm:gap-2.5" onPaste={(e) => {
      const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      if (text) {
        e.preventDefault();
        onChange(text);
        refs.current[Math.min(text.length, 5)]?.focus();
      }
    }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(-1);
            set(i, v);
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d && i > 0) {
              set(i - 1, '');
              refs.current[i - 1]?.focus();
            }
            if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
          }}
          className={`tabular h-13 w-full min-w-0 rounded-xl border bg-white text-center text-xl font-semibold text-ink shadow-[0_1px_2px_rgb(20_43_69/0.05)] transition-all focus:outline-none focus:ring-4 ${
            invalid ? 'border-red-400 focus:ring-red-500/12' : d ? 'border-brand-400 focus:border-brand-500 focus:ring-brand-500/12' : 'border-line-strong focus:border-brand-500 focus:ring-brand-500/12'
          }`}
        />
      ))}
    </div>
  );
}

/** Clearly labelled simulated-delivery notice used wherever a demo OTP is shown. */
export function DemoOtpNotice({ code, onUse }) {
  if (!code) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 px-4 py-3">
      <div className="text-[13px] leading-5 text-amber-900">
        <p className="font-semibold">Simulated delivery — demo environment</p>
        <p className="opacity-90">No SMS gateway is connected. Your code is <span className="tabular font-mono font-semibold tracking-wider">{code}</span></p>
      </div>
      {onUse && (
        <button type="button" onClick={() => onUse(code)} className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100">
          Autofill
        </button>
      )}
    </div>
  );
}
