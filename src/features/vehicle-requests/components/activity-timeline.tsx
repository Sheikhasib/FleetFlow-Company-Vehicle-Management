'use client';

import * as React from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Ban,
  Car,
  ThumbsUp,
  MapPin,
  Users,
  Navigation,
  Flag,
  Clock,
  History,
  Activity,
  LucideIcon,
} from 'lucide-react';
import { UserRole } from '@/types/domain';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';
import {
  ActivityTimelineItemViewModel,
  TimelineEventVariant,
} from '../types/view-models';

export interface ActivityTimelineProps {
  items: ActivityTimelineItemViewModel[];
  className?: string;
}

/**
 * Resolves appropriate semantic Lucide icon for an activity item based on its action token.
 */
function resolveActionIcon(action: string): LucideIcon {
  const normalized = (action || '').trim().toUpperCase();

  switch (normalized) {
    case 'REQUEST_SUBMITTED':
      return FileText;
    case 'REQUEST_APPROVED':
      return CheckCircle2;
    case 'REQUEST_REJECTED':
      return XCircle;
    case 'REQUEST_CANCELLED':
      return Ban;
    case 'REQUEST_COMPLETED':
      return Flag;
    case 'ASSIGNMENT_DISPATCHED':
    case 'ASSIGNMENT_CREATED':
      return Car;
    case 'TRIP_ACCEPTED':
      return ThumbsUp;
    case 'ARRIVED_AT_PICKUP':
      return MapPin;
    case 'PASSENGERS_PICKED_UP':
      return Users;
    case 'TRIP_STARTED':
      return Navigation;
    case 'PASSENGERS_DROPPED_OFF':
      return MapPin;
    case 'TRIP_LEG_COMPLETED':
      return CheckCircle2;
    default:
      return Activity;
  }
}

function getIconContainerStyles(variant: TimelineEventVariant): string {
  switch (variant) {
    case 'success':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800';
    case 'destructive':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'warning':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300 dark:border-amber-800';
    case 'info':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-300 dark:border-blue-800';
    case 'default':
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function getRoleBadgeVariant(role: UserRole | 'SYSTEM'): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'ADMIN':
      return 'secondary';
    case 'DRIVER':
      return 'secondary';
    case 'EMPLOYEE':
    case 'SYSTEM':
    default:
      return 'outline';
  }
}

/**
 * Pure presentation component for rendering a request's chronological activity audit trail.
 * Receives pre-computed ViewModels and performs zero domain transformation or business logic.
 */
export function ActivityTimeline({ items, className }: ActivityTimelineProps) {
  const safeItems = items || [];

  return (
    <Card className={cn('border-border/80 shadow-sm overflow-hidden', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-primary">
            <History className="h-5 w-5" aria-hidden="true" />
            <CardTitle className="text-base sm:text-lg">Activity & Audit History</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-medium">
            {safeItems.length} {safeItems.length === 1 ? 'Event' : 'Events'}
          </Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Chronological audit trail of all administrative reviews, dispatch updates, and trip milestones.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        {safeItems.length === 0 ? (
          <EmptyState
            title="No Activity Recorded Yet"
            description="Audit events will appear here as this request is reviewed, assigned, and fulfilled."
            icon={Clock}
            className="py-8"
          />
        ) : (
          <ol
            aria-label="Request Activity History"
            className="relative border-l border-border/80 ml-3.5 sm:ml-4 space-y-6 sm:space-y-7 pb-2"
          >
            {safeItems.map((item) => {
              const Icon = resolveActionIcon(item.action);
              const iconStyles = getIconContainerStyles(item.variant);

              return (
                <li key={item.id} className="relative pl-6 sm:pl-8">
                  {/* Semantic Action Node Icon */}
                  <div
                    className={cn(
                      'absolute -left-[15px] sm:-left-[17px] top-0.5 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 border-background shadow-xs transition-colors',
                      iconStyles
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>

                  {/* Event Details Content */}
                  <div className="space-y-1.5">
                    {/* Header Row: Title, Outbound/Return Leg Badge, Actor Info */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-sm font-semibold text-foreground tracking-tight">
                        {item.title}
                      </span>

                      {/* Leg Scope Badge if applicable */}
                      {item.leg && (
                        <Badge
                          variant="outline"
                          className="text-[10px] sm:text-xs font-normal border-primary/30 text-primary bg-primary/5 py-0 px-1.5"
                        >
                          {item.leg.label}
                        </Badge>
                      )}

                      {/* Actor Badge */}
                      <span className="text-muted-foreground text-xs">•</span>
                      <span className="text-xs font-medium text-foreground">
                        {item.actor.name}
                      </span>
                      <Badge
                        variant={getRoleBadgeVariant(item.actor.role)}
                        className="text-[10px] py-0 px-1.5 font-normal"
                      >
                        {item.actor.roleLabel}
                      </Badge>
                    </div>

                    {/* Narrative Description */}
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>

                    {/* Timestamp: Relative + Absolute Local Time */}
                    <div className="pt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {item.isValidTimestamp ? (
                        <time dateTime={item.timestamp}>
                          <span className="font-medium text-foreground/80">
                            {item.relativeTime}
                          </span>
                          <span className="mx-1 text-muted-foreground/60">•</span>
                          <span>{item.displayDateTime}</span>
                        </time>
                      ) : (
                        <span>Timestamp unavailable</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
