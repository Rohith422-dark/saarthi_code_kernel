import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { useT } from '../../i18n';
import { cn, masteryTone } from '../../lib/utils';

const button = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-field text-[14px] font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px]',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-hover',
        secondary: 'border border-line bg-surface text-ink hover:bg-neutral active:bg-neutral',
        ghost: 'text-slate hover:bg-neutral hover:text-ink',
        subtle: 'bg-primary-subtle text-primary hover:bg-[#d3ece7]',
        danger: 'border border-line bg-surface text-critical hover:bg-critical-surface',
      },
      size: { md: 'h-10 px-4', lg: 'h-11 px-5', sm: 'h-8 px-3 text-[13px] [&_svg]:size-4', icon: 'size-10', 'icon-sm': 'size-8 [&_svg]:size-4' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export const Button = forwardRef(({ className, variant, size, ...p }, ref) => (
  <button ref={ref} className={cn(button({ variant, size }), className)} {...p} />
));

export const Card = ({ className, ...p }) => <div className={cn('card', className)} {...p} />;
export const CardHeader = ({ title, meta, action, className }) => (
  <div className={cn('flex items-start justify-between gap-3 px-5 pt-4', className)}>
    <div className="min-w-0">
      <h3>{title}</h3>
      {meta && <p className="meta mt-0.5">{meta}</p>}
    </div>
    {action}
  </div>
);

const tones = {
  success: 'bg-success-surface text-success',
  warning: 'bg-warning-surface text-warning',
  critical: 'bg-critical-surface text-critical',
  info: 'bg-[#E8F0FE] text-info',
  neutral: 'bg-neutral text-slate',
  teal: 'bg-primary-subtle text-primary',
};
export const Badge = ({ tone = 'neutral', dot, className, children }) => (
  <span className={cn('inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-medium', tones[tone], className)}>
    {dot && <span className="size-1.5 rounded-full bg-current" />}
    {children}
  </span>
);

const statusTone = {
  Approved: 'success', Effective: 'success', Draft: 'neutral', 'Pending review': 'warning', Retired: 'neutral',
  mastered: 'success', learning: 'warning', gap: 'critical',
};
const statusLabel = { mastered: 'Mastered', learning: 'Learning', gap: 'Gap' };
export const StatusBadge = ({ status }) => {
  const { t } = useT();
  return <Badge tone={statusTone[status] || 'neutral'} dot>{t(statusLabel[status] || status)}</Badge>;
};

export const Skeleton = ({ className }) => (
  <div className={cn('relative overflow-hidden rounded-md bg-skel', className)}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>
);

const toneBar = { success: 'bg-success', warning: 'bg-[#D97706]', critical: 'bg-critical', teal: 'bg-primary' };
export function Bar({ value, tone, className, label }) {
  const t = tone || 'teal';
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-track', className)} role="progressbar" aria-label={label} aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-[width] duration-300', toneBar[t])} style={{ width: `${Math.max(2, value * 100)}%` }} />
    </div>
  );
}
export const MasteryBar = ({ value, className }) => (
  <Bar value={value} tone={masteryTone(value) === 'success' ? 'teal' : masteryTone(value)} className={className} label="Mastery" />
);

const field = 'w-full rounded-field border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-faint transition-colors duration-150 hover:border-[#c6d3da] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:bg-neutral disabled:text-faint';
export const Input = forwardRef(({ className, ...p }, ref) => <input ref={ref} className={cn(field, 'h-[42px]', className)} {...p} />);
export const Textarea = forwardRef(({ className, ...p }, ref) => <textarea ref={ref} className={cn(field, 'min-h-[44px] resize-none py-2.5', className)} {...p} />);
export const Select = ({ className, children, ...p }) => (
  <select className={cn(field, 'h-[42px] cursor-pointer pr-8', className)} {...p}>{children}</select>
);

export function PageHeader({ title, description, meta, action }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1>{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14.5px] text-slate">{description}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 meta">{meta}</div>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}

export const Empty = ({ icon: Icon, title, children }) => (
  <div className="flex flex-col items-center px-6 py-12 text-center">
    {Icon && <div className="mb-3 grid size-10 place-items-center rounded-full bg-neutral text-slate"><Icon className="size-5" /></div>}
    <p className="font-medium text-ink">{title}</p>
    {children && <p className="meta mt-1 max-w-sm">{children}</p>}
  </div>
);

export const ErrorBox = ({ message, onRetry }) => (
  <div className="card flex items-center justify-between gap-3 border-[#f0c7c7] bg-critical-surface p-4 text-critical">
    <p className="text-[13.5px]">{message}</p>
    {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}
  </div>
);

export const Avatar = ({ name, size = 32, className }) => (
  <span className={cn('grid shrink-0 place-items-center rounded-full border border-line bg-primary-subtle text-[12px] font-semibold text-primary', className)} style={{ width: size, height: size }}>
    {name?.slice(0, 1)}
  </span>
);
