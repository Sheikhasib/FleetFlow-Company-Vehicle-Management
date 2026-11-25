import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { RequestStatus, TripLegStatus } from '@/types/domain';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow-sm',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow-sm',
        outline: 'border-border text-foreground bg-transparent',
        sapphire: 'border-transparent bg-accent text-accent-foreground shadow-sm',

        // RequestStatus variants (lowercase)
        pending: 'bg-amber-50 text-amber-900 border-amber-200/80',
        approved: 'bg-blue-50 text-blue-900 border-blue-200/80',
        assigned: 'bg-indigo-50 text-indigo-900 border-indigo-200/80',
        completed: 'bg-emerald-50 text-emerald-900 border-emerald-200/80',
        rejected: 'bg-rose-50 text-rose-900 border-rose-200/80',
        cancelled: 'bg-slate-100 text-slate-700 border-slate-200',

        // RequestStatus variants (uppercase domain keys)
        PENDING: 'bg-amber-50 text-amber-900 border-amber-200/80',
        APPROVED: 'bg-blue-50 text-blue-900 border-blue-200/80',
        ASSIGNED: 'bg-indigo-50 text-indigo-900 border-indigo-200/80',
        COMPLETED: 'bg-emerald-50 text-emerald-900 border-emerald-200/80',
        REJECTED: 'bg-rose-50 text-rose-900 border-rose-200/80',
        CANCELLED: 'bg-slate-100 text-slate-700 border-slate-200',

        // TripLegStatus variants (lowercase)
        pending_assignment: 'bg-amber-50 text-amber-900 border-amber-200/80',
        accepted: 'bg-sky-50 text-sky-900 border-sky-200/80',
        arrived_at_pickup: 'bg-teal-50 text-teal-900 border-teal-200/80',
        picked_up: 'bg-blue-50 text-blue-900 border-blue-200/80',
        in_progress: 'bg-purple-50 text-purple-900 border-purple-200/80',
        dropped_off: 'bg-cyan-50 text-cyan-900 border-cyan-200/80',

        // TripLegStatus variants (uppercase domain keys)
        PENDING_ASSIGNMENT: 'bg-amber-50 text-amber-900 border-amber-200/80',
        ACCEPTED: 'bg-sky-50 text-sky-900 border-sky-200/80',
        ARRIVED_AT_PICKUP: 'bg-teal-50 text-teal-900 border-teal-200/80',
        PICKED_UP: 'bg-blue-50 text-blue-900 border-blue-200/80',
        IN_PROGRESS: 'bg-purple-50 text-purple-900 border-purple-200/80',
        DROPPED_OFF: 'bg-cyan-50 text-cyan-900 border-cyan-200/80',

        // Backward compatibility alias
        active: 'bg-purple-50 text-purple-900 border-purple-200/80',
        ACTIVE: 'bg-purple-50 text-purple-900 border-purple-200/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// Semantic Status Rail mapping for badges
const statusRailClasses: Record<string, string> = {
  pending: 'status-rail-pending pl-2 rounded-l-none',
  PENDING: 'status-rail-pending pl-2 rounded-l-none',
  pending_assignment: 'status-rail-pending pl-2 rounded-l-none',
  PENDING_ASSIGNMENT: 'status-rail-pending pl-2 rounded-l-none',
  approved: 'status-rail-approved pl-2 rounded-l-none',
  APPROVED: 'status-rail-approved pl-2 rounded-l-none',
  assigned: 'status-rail-assigned pl-2 rounded-l-none',
  ASSIGNED: 'status-rail-assigned pl-2 rounded-l-none',
  accepted: 'status-rail-accepted pl-2 rounded-l-none',
  ACCEPTED: 'status-rail-accepted pl-2 rounded-l-none',
  arrived_at_pickup: 'status-rail-arrived-at-pickup pl-2 rounded-l-none',
  ARRIVED_AT_PICKUP: 'status-rail-arrived-at-pickup pl-2 rounded-l-none',
  picked_up: 'status-rail-picked-up pl-2 rounded-l-none',
  PICKED_UP: 'status-rail-picked-up pl-2 rounded-l-none',
  in_progress: 'status-rail-in-progress pl-2 rounded-l-none',
  IN_PROGRESS: 'status-rail-in-progress pl-2 rounded-l-none',
  active: 'status-rail-in-progress pl-2 rounded-l-none',
  ACTIVE: 'status-rail-in-progress pl-2 rounded-l-none',
  dropped_off: 'status-rail-dropped-off pl-2 rounded-l-none',
  DROPPED_OFF: 'status-rail-dropped-off pl-2 rounded-l-none',
  completed: 'status-rail-completed pl-2 rounded-l-none',
  COMPLETED: 'status-rail-completed pl-2 rounded-l-none',
  cancelled: 'status-rail-cancelled pl-2 rounded-l-none',
  CANCELLED: 'status-rail-cancelled pl-2 rounded-l-none',
  rejected: 'status-rail-rejected pl-2 rounded-l-none',
  REJECTED: 'status-rail-rejected pl-2 rounded-l-none',
};

// Status dot indicator colors
const statusDotClasses: Record<string, string> = {
  pending: 'bg-amber-500',
  PENDING: 'bg-amber-500',
  pending_assignment: 'bg-amber-500',
  PENDING_ASSIGNMENT: 'bg-amber-500',
  approved: 'bg-blue-600',
  APPROVED: 'bg-blue-600',
  assigned: 'bg-indigo-600',
  ASSIGNED: 'bg-indigo-600',
  accepted: 'bg-sky-600',
  ACCEPTED: 'bg-sky-600',
  arrived_at_pickup: 'bg-teal-600',
  ARRIVED_AT_PICKUP: 'bg-teal-600',
  picked_up: 'bg-blue-600',
  PICKED_UP: 'bg-blue-600',
  in_progress: 'bg-purple-600',
  IN_PROGRESS: 'bg-purple-600',
  active: 'bg-purple-600',
  ACTIVE: 'bg-purple-600',
  dropped_off: 'bg-cyan-600',
  DROPPED_OFF: 'bg-cyan-600',
  completed: 'bg-emerald-600',
  COMPLETED: 'bg-emerald-600',
  cancelled: 'bg-slate-400',
  CANCELLED: 'bg-slate-400',
  rejected: 'bg-rose-600',
  REJECTED: 'bg-rose-600',
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  rail?: boolean;
  dot?: boolean;
}

function Badge({
  className,
  variant = 'default',
  rail = false,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variantKey = variant || 'default';
  const railClass = rail && statusRailClasses[variantKey] ? statusRailClasses[variantKey] : '';
  const dotColorClass = dot && statusDotClasses[variantKey] ? statusDotClasses[variantKey] : 'bg-current';

  return (
    <div className={cn(badgeVariants({ variant }), railClass, className)} {...props}>
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full inline-block shrink-0', dotColorClass)}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
