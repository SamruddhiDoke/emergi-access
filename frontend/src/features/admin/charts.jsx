import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';

// Validated categorical palette (light surface): teal, orange, violet — fixed order, never cycled.
export const SERIES = ['#0a8f9e', '#eb6834', '#6250d6'];
const AXIS = { fontSize: 11, fill: '#687786' };
const GRID = '#eef1f4';

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-1.5 text-xs text-muted">
          <span className="h-2 w-3 rounded-sm" style={{ background: it.color || SERIES[i] }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function TooltipBox({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 shadow-[var(--shadow-pop)]">
      <p className="mb-1 text-xs font-semibold text-ink">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center justify-between gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: p.color || p.payload?.fill }} />{p.name}</span>
          <span className="tabular font-semibold text-ink">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

const shortDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const longDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/** Multi-series line chart over days. series: [{ key, label }] */
export function TimeSeriesChart({ data, series, height = 240 }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipBox labelFormatter={longDate} />} cursor={{ stroke: '#d4dce2', strokeWidth: 1 }} />
          {series.map((s, i) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={SERIES[i]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Single-measure horizontal bars with direct value labels. */
export function HorizontalBars({ data, labelKey, valueKey = 'count', name = 'Count', height, color = SERIES[0], format = (v) => v }) {
  const h = height || Math.max(120, data.length * 38);
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey={labelKey} width={150} tickFormatter={format} tick={{ ...AXIS, fill: '#172b3a' }} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipBox labelFormatter={format} />} cursor={{ fill: 'rgb(20 43 69 / 0.04)' }} />
          <Bar dataKey={valueKey} name={name} fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: 'right', fontSize: 11, fill: '#172b3a', fontWeight: 600 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Grouped vertical bars. series: [{ key, label }] */
export function GroupedBars({ data, labelKey, series, height = 240, format = (v) => v }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={labelKey} tickFormatter={format} tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipBox labelFormatter={format} />} cursor={{ fill: 'rgb(20 43 69 / 0.04)' }} />
          {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={SERIES[i]} radius={[4, 4, 0, 0]} maxBarSize={28} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Single-series column chart (e.g. hourly distribution). */
export function Columns({ data, labelKey, valueKey = 'count', name = 'Requests', height = 180, format = (v) => v, highlight }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={labelKey} tickFormatter={format} tick={AXIS} axisLine={false} tickLine={false} interval={2} />
          <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipBox labelFormatter={format} />} cursor={{ fill: 'rgb(20 43 69 / 0.04)' }} />
          <Bar dataKey={valueKey} name={name} radius={[4, 4, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={highlight?.(d) ? SERIES[1] : SERIES[0]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const STATUS_COLOR = { ACTIVE: '#10b981', PENDING: '#f59e0b', EXPIRED: '#95a2ae', REVOKED: '#ef4444', DENIED: '#b91c1c' };

/** Status distribution as labelled meters — status colours always paired with the label. */
export function StatusMeters({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.status}>
          <div className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2 font-medium text-ink"><span className="size-2 rounded-full" style={{ background: STATUS_COLOR[d.status] }} />{d.status.charAt(0) + d.status.slice(1).toLowerCase()}</span>
            <span className="tabular text-muted"><span className="font-semibold text-ink">{d.count}</span> · {Math.round((d.count / total) * 100)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]"><div className="h-full rounded-full" style={{ width: `${(d.count / total) * 100}%`, background: STATUS_COLOR[d.status] }} /></div>
        </li>
      ))}
    </ul>
  );
}
