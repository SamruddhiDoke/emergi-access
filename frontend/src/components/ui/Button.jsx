import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-brand-600 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(8_127_140/0.3)] hover:bg-brand-700 disabled:bg-brand-600/50',
  navy: 'bg-navy-800 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] hover:bg-navy-900 disabled:bg-navy-800/50',
  secondary: 'bg-white text-ink border border-line-strong shadow-[0_1px_2px_rgb(20_43_69/0.05)] hover:bg-canvas hover:border-subtle/60 disabled:text-subtle',
  ghost: 'text-muted hover:text-ink hover:bg-ink/[0.04] disabled:text-subtle',
  danger: 'bg-red-600 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-red-700 disabled:bg-red-600/50',
  'danger-soft': 'bg-red-50 text-red-700 border border-red-200/80 hover:bg-red-100 disabled:opacity-50',
  link: 'text-brand-700 hover:text-brand-800 underline-offset-4 hover:underline px-0 h-auto',
};

const SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-xl',
  icon: 'size-9 rounded-lg justify-center',
};

export const buttonClass = ({ variant = 'primary', size = 'md', className = '' } = {}) =>
  `inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 select-none disabled:cursor-not-allowed ${VARIANTS[variant]} ${variant === 'link' ? '' : SIZES[size]} ${className}`;

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, iconRight: IconRight, to, href, className = '', children, disabled, ...props },
  ref,
) {
  const cls = buttonClass({ variant, size, className });
  const content = (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon && <Icon className="size-4 shrink-0" strokeWidth={2} />}
      {children}
      {IconRight && !loading && <IconRight className="size-4 shrink-0" strokeWidth={2} />}
    </>
  );
  if (to) return <Link ref={ref} to={to} className={cls} {...props}>{content}</Link>;
  if (href) return <a ref={ref} href={href} className={cls} {...props}>{content}</a>;
  return (
    <motion.button
      ref={ref}
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      className={cls}
      disabled={disabled || loading}
      {...props}
    >
      {content}
    </motion.button>
  );
});
