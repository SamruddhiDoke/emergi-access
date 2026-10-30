import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Keyboard } from 'lucide-react';
import { Button } from '../../components/ui/Button';

/** Normalises typed input into the EA-XXXX-XXXX-XXXX-XXXX shape as the user types. */
export function formatEmergencyId(raw) {
  const clean = raw.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^EA/, '').slice(0, 16);
  const groups = clean.match(/.{1,4}/g) || [];
  return clean.length ? `EA-${groups.join('-')}` : '';
}

export function ManualEntry({ compact = false, autoFocus = false }) {
  const [value, setValue] = useState('');
  const navigate = useNavigate();
  const complete = /^EA-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(value);

  const submit = (e) => {
    e.preventDefault();
    if (complete) navigate(`/pro/access/new?eid=${encodeURIComponent(value)}`);
  };

  return (
    <form onSubmit={submit} className={compact ? 'flex gap-2' : 'space-y-3'}>
      <div className="relative flex-1">
        <Keyboard className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <input
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(formatEmergencyId(e.target.value))}
          placeholder="EA-XXXX-XXXX-XXXX-XXXX"
          aria-label="Emergency ID"
          spellCheck={false}
          className={`w-full rounded-lg border border-line-strong bg-white pl-9 pr-3 font-mono tracking-wider text-ink placeholder:font-sans placeholder:tracking-normal placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12 ${compact ? 'h-10 text-sm' : 'h-12 text-base'}`}
        />
      </div>
      <Button type="submit" disabled={!complete} iconRight={ArrowRight} size={compact ? 'md' : 'lg'} className={compact ? '' : 'w-full'}>
        {compact ? 'Look up' : 'Identify patient'}
      </Button>
    </form>
  );
}
