import { clsx } from 'clsx';

type Variant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-violet-100 text-violet-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  neutral: 'bg-gray-100 text-gray-600',
  info: 'bg-sky-100 text-sky-700',
};

const dotColors: Record<Variant, string> = {
  primary: 'bg-violet-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  neutral: 'bg-gray-400',
  info: 'bg-sky-500',
};

export function Badge({ variant = 'neutral', children, className, dot }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}

export function jobStatusBadge(status: string) {
  const map: Record<string, { variant: Variant; label: string }> = {
    open: { variant: 'success', label: 'Open' },
    assigned: { variant: 'info', label: 'Assigned' },
    in_progress: { variant: 'warning', label: 'In Progress' },
    completed: { variant: 'neutral', label: 'Completed' },
    cancelled: { variant: 'danger', label: 'Cancelled' },
  };
  const { variant, label } = map[status] ?? { variant: 'neutral', label: status };
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function bidStatusBadge(status: string) {
  const map: Record<string, { variant: Variant; label: string }> = {
    pending: { variant: 'warning', label: 'Pending' },
    accepted: { variant: 'success', label: 'Accepted' },
    rejected: { variant: 'danger', label: 'Rejected' },
    withdrawn: { variant: 'neutral', label: 'Withdrawn' },
  };
  const { variant, label } = map[status] ?? { variant: 'neutral', label: status };
  return <Badge variant={variant} dot>{label}</Badge>;
}
