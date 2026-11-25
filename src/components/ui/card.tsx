import * as React from 'react';
import { cn } from '@/lib/utils';
import { RequestStatus, TripLegStatus } from '@/types/domain';

export type StatusRailKey =
  | RequestStatus
  | TripLegStatus
  | Lowercase<RequestStatus>
  | Lowercase<TripLegStatus>;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  statusRail?: StatusRailKey;
}

const statusRailClassMap: Record<string, string> = {
  // RequestStatus (lowercase & uppercase)
  pending: 'status-rail-pending',
  PENDING: 'status-rail-pending',
  approved: 'status-rail-approved',
  APPROVED: 'status-rail-approved',
  assigned: 'status-rail-assigned',
  ASSIGNED: 'status-rail-assigned',
  completed: 'status-rail-completed',
  COMPLETED: 'status-rail-completed',
  cancelled: 'status-rail-cancelled',
  CANCELLED: 'status-rail-cancelled',
  rejected: 'status-rail-rejected',
  REJECTED: 'status-rail-rejected',

  // TripLegStatus (lowercase & uppercase)
  pending_assignment: 'status-rail-pending',
  PENDING_ASSIGNMENT: 'status-rail-pending',
  accepted: 'status-rail-accepted',
  ACCEPTED: 'status-rail-accepted',
  arrived_at_pickup: 'status-rail-arrived-at-pickup',
  ARRIVED_AT_PICKUP: 'status-rail-arrived-at-pickup',
  picked_up: 'status-rail-picked-up',
  PICKED_UP: 'status-rail-picked-up',
  in_progress: 'status-rail-in-progress',
  IN_PROGRESS: 'status-rail-in-progress',
  dropped_off: 'status-rail-dropped-off',
  DROPPED_OFF: 'status-rail-dropped-off',
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, statusRail, ...props }, ref) => {
    const railClass = statusRail ? statusRailClassMap[statusRail] : undefined;

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border bg-card text-card-foreground shadow-elevation-1 transition-all',
          interactive && 'hover:border-primary/40 hover:shadow-elevation-2 cursor-pointer',
          railClass,
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-semibold leading-none tracking-tight text-foreground', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
