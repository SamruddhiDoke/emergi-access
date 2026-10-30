import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Card({ children, className = '', padded = true, as: Tag = 'div', ...props }) {
  return (
    <Tag className={`card ${padded ? 'p-5' : ''} ${className}`} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, action, icon: Icon, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-muted ring-1 ring-line">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] leading-5 text-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions, back }) {
  return (
    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back && (
          <Link to={back.to} className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
            <ChevronLeft className="size-4" />
            {back.label}
          </Link>
        )}
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, hint, tone = 'neutral', to }) {
  const tones = {
    neutral: 'text-muted bg-canvas ring-line',
    brand: 'text-brand-700 bg-brand-50 ring-brand-600/10',
    success: 'text-emerald-700 bg-emerald-50 ring-emerald-600/10',
    warning: 'text-amber-700 bg-amber-50 ring-amber-600/15',
    danger: 'text-red-700 bg-red-50 ring-red-600/10',
  };
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        {Icon && (
          <span className={`flex size-7 items-center justify-center rounded-lg ring-1 ${tones[tone]}`}>
            <Icon className="size-3.5" strokeWidth={2.25} />
          </span>
        )}
      </div>
      <p className="tabular mt-3 text-[28px] font-semibold leading-none tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = 'card block p-4 transition-shadow';
  return to ? (
    <Link to={to} className={`${cls} hover:shadow-[var(--shadow-raised)]`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/**
 * columns: [{ key, header, render?, className?, headerClassName? }]
 */
export function Table({ columns, rows, onRowClick, rowKey = (r) => r.id, empty, dense }) {
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-[13px]">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`sticky top-0 border-b border-line bg-canvas/70 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted first:pl-5 last:pr-5 ${c.headerClassName || ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <motion.tr
              key={rowKey(r)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.015, 0.2) }}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={`group ${onRowClick ? 'cursor-pointer hover:bg-brand-50/40' : ''}`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`border-b border-line/80 px-4 ${dense ? 'py-2.5' : 'py-3'} align-middle text-ink first:pl-5 last:pr-5 group-last:border-b-0 ${c.className || ''}`}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && empty}
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.total, meta.page * meta.pageSize);
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3 text-[13px] text-muted">
      <span className="tabular">
        {from}–{to} of {meta.total}
      </span>
      <div className="flex items-center gap-1">
        <button disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} className="flex size-8 items-center justify-center rounded-lg border border-line bg-white hover:bg-canvas disabled:opacity-40" aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </button>
        <span className="tabular px-2">
          {meta.page} / {meta.totalPages}
        </span>
        <button disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)} className="flex size-8 items-center justify-center rounded-lg border border-line bg-white hover:bg-canvas disabled:opacity-40" aria-label="Next page">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 overflow-x-auto border-b border-line ${className}`} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={`relative flex h-10 shrink-0 items-center gap-2 px-3 text-[13px] font-medium transition-colors ${value === t.value ? 'text-ink' : 'text-muted hover:text-ink'}`}
        >
          {t.icon && <t.icon className="size-4" />}
          {t.label}
          {t.count !== undefined && (
            <span className={`tabular rounded-full px-1.5 text-[11px] ${value === t.value ? 'bg-brand-50 text-brand-700' : 'bg-ink/[0.05] text-muted'}`}>{t.count}</span>
          )}
          {value === t.value && <motion.span layoutId={`tab-${tabs.map((x) => x.value).join()}`} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
        </button>
      ))}
    </div>
  );
}

/** Vertical or horizontal progress stepper. steps: [{ label, description }] */
export function Stepper({ steps, current, orientation = 'horizontal' }) {
  if (orientation === 'vertical') {
    return (
      <ol className="space-y-0">
        {steps.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'todo';
          return (
            <li key={s.label} className="relative flex gap-3 pb-6 last:pb-0">
              {i < steps.length - 1 && <span className={`absolute left-[13px] top-7 h-[calc(100%-28px)] w-px ${i < current ? 'bg-brand-500' : 'bg-line-strong'}`} />}
              <span
                className={`relative z-10 flex size-[27px] shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  state === 'done' ? 'bg-brand-600 text-white' : state === 'current' ? 'bg-white text-brand-700 ring-2 ring-brand-600' : 'bg-white text-subtle ring-1 ring-line-strong'
                }`}
              >
                {state === 'done' ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <div className="pt-0.5">
                <p className={`text-[13px] font-semibold ${state === 'todo' ? 'text-subtle' : 'text-ink'}`}>{s.label}</p>
                {s.description && <p className="mt-0.5 text-xs leading-5 text-muted">{s.description}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }
  return (
    <ol className="flex items-center gap-2">
      {steps.map((s, i) => (
        <li key={s.label} className="flex flex-1 items-center gap-2">
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
              i < current ? 'bg-brand-600 text-white' : i === current ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-600' : 'bg-ink/[0.05] text-subtle'
            }`}
          >
            {i < current ? <Check className="size-3" strokeWidth={3} /> : i + 1}
          </span>
          <span className={`hidden text-xs font-medium sm:inline ${i <= current ? 'text-ink' : 'text-subtle'}`}>{s.label}</span>
          {i < steps.length - 1 && <span className={`h-px flex-1 ${i < current ? 'bg-brand-500' : 'bg-line-strong'}`} />}
        </li>
      ))}
    </ol>
  );
}

export function DefinitionList({ items, className = '' }) {
  return (
    <dl className={`divide-y divide-line ${className}`}>
      {items.filter(Boolean).map(([label, value]) => (
        <div key={label} className="grid grid-cols-[minmax(0,140px)_1fr] gap-4 py-2.5 text-[13px]">
          <dt className="text-muted">{label}</dt>
          <dd className="min-w-0 break-words font-medium text-ink">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({ value, className = '', tone = 'brand' }) {
  const color = { brand: 'bg-brand-600', warning: 'bg-amber-500', danger: 'bg-red-500', success: 'bg-emerald-500' }[tone];
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-ink/[0.07] ${className}`}>
      <motion.div className={`h-full rounded-full ${color}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, value))}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}
