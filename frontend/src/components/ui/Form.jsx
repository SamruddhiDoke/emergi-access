import { forwardRef, useId } from 'react';
import { ChevronDown, AlertCircle, Check } from 'lucide-react';

const base =
  'w-full rounded-lg border bg-white text-sm text-ink placeholder:text-subtle shadow-[0_1px_2px_rgb(20_43_69/0.04)] transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-4 disabled:bg-canvas disabled:text-muted';
const ok = 'border-line-strong hover:border-subtle/70 focus:border-brand-500 focus:ring-brand-500/12';
const bad = 'border-red-400 focus:border-red-500 focus:ring-red-500/12';

export function Field({ label, hint, error, required, children, htmlFor, className = '', action }) {
  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
            {label}
            {required && <span className="ml-0.5 text-brand-600">*</span>}
          </label>
          {action}
        </div>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600" role="alert">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, hint, error, required, icon: Icon, className = '', fieldClassName, action, ...props }, ref) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={props.id || id} className={fieldClassName} action={action}>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />}
        <input
          ref={ref}
          id={props.id || id}
          aria-invalid={Boolean(error)}
          className={`${base} ${error ? bad : ok} h-10 ${Icon ? 'pl-9' : 'pl-3'} pr-3 ${className}`}
          {...props}
        />
      </div>
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea({ label, hint, error, required, className = '', fieldClassName, ...props }, ref) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={props.id || id} className={fieldClassName}>
      <textarea
        ref={ref}
        id={props.id || id}
        aria-invalid={Boolean(error)}
        className={`${base} ${error ? bad : ok} min-h-24 resize-y px-3 py-2.5 leading-6 ${className}`}
        {...props}
      />
    </Field>
  );
});

export const Select = forwardRef(function Select({ label, hint, error, required, options = [], placeholder, className = '', fieldClassName, ...props }, ref) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={props.id || id} className={fieldClassName}>
      <div className="relative">
        <select
          ref={ref}
          id={props.id || id}
          aria-invalid={Boolean(error)}
          className={`${base} ${error ? bad : ok} h-10 appearance-none pl-3 pr-9 ${className}`}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      </div>
    </Field>
  );
});

export const Checkbox = forwardRef(function Checkbox({ label, description, className = '', ...props }, ref) {
  const id = useId();
  return (
    <label htmlFor={props.id || id} className={`group flex cursor-pointer items-start gap-3 ${className}`}>
      <span className="relative mt-0.5 flex size-[18px] shrink-0 items-center justify-center">
        <input ref={ref} id={props.id || id} type="checkbox" className="peer absolute inset-0 cursor-pointer appearance-none rounded-[5px] border border-line-strong bg-white transition-colors checked:border-brand-600 checked:bg-brand-600 focus-visible:ring-4 focus-visible:ring-brand-500/15" {...props} />
        <Check className="pointer-events-none relative size-3 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-5 text-muted">{description}</span>}
      </span>
    </label>
  );
});

/** Segmented single-choice control. */
export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-lg bg-ink/[0.05] p-0.5 ${className}`} role="radiogroup">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-8 rounded-md px-3 text-[13px] font-medium transition-all ${value === o.value ? 'bg-white text-ink shadow-[0_1px_2px_rgb(20_43_69/0.12)]' : 'text-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
