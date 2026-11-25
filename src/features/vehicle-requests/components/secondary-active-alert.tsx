'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Car,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Clock,
  Layers,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatDisplayTime, formatDisplayDateTime } from '@/lib/utils/date';
import {
  ActiveTripViewModel,
  getTripLifecycleMilestone,
} from '../types/view-models';

export interface SecondaryActiveAlertProps {
  secondaryTrips: readonly ActiveTripViewModel[];
  onSelectTrip?: (trip: ActiveTripViewModel) => void;
  className?: string;
}

/**
 * SecondaryActiveAlert
 *
 * Informs employees when they have multiple concurrent active trips.
 * Prioritizes clarity without using alarming danger-level visuals.
 *
 * Features:
 * - Clear count banner for concurrent journeys
 * - Accessible collapsible/expandable panel with min 44x44px touch targets
 * - Compact collapsed pill summaries for glanceability
 * - Expanded card list detailing each secondary trip's route, status, and assignment
 * - Direct navigation action to view full request details
 */
export function SecondaryActiveAlert({
  secondaryTrips,
  onSelectTrip,
  className,
}: SecondaryActiveAlertProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!secondaryTrips || secondaryTrips.length === 0) {
    return null;
  }

  const tripCount = secondaryTrips.length;
  const countLabel = tripCount === 1 ? '1 Additional Active Trip' : `${tripCount} Additional Active Trips`;

  return (
    <div
      role="region"
      aria-label="Additional Active Journeys Alert"
      className={cn(
        'rounded-xl border border-indigo-200/80 bg-indigo-50/60 dark:bg-indigo-950/20 dark:border-indigo-800/60 p-4 sm:p-5 shadow-xs transition-colors',
        className
      )}
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Header Banner & Collapse Toggle                                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs mt-0.5"
            aria-hidden="true"
          >
            <Layers className="h-5 w-5" />
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                {countLabel}
              </span>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-200">
                Concurrent
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              You have concurrent transportation bookings currently underway.
            </p>
          </div>
        </div>

        {/* Expand / Collapse Button */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-controls="secondary-active-trips-list"
          className="self-start sm:self-auto inline-flex items-center justify-between gap-2 min-h-[44px] px-3.5 py-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200 bg-white/80 dark:bg-card border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 shadow-2xs transition-colors"
        >
          <span>{isExpanded ? 'Hide Details' : `View ${countLabel}`}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Collapsed Pill Summary (Visible when collapsed)                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {!isExpanded && (
        <div className="mt-3.5 pt-3 border-t border-indigo-200/60 dark:border-indigo-800/50 flex flex-wrap gap-2">
          {secondaryTrips.map((trip) => {
            const milestone = getTripLifecycleMilestone(trip.status);
            return (
              <div
                key={trip.legId}
                className="inline-flex items-center gap-2 rounded-lg bg-background/80 border border-indigo-200/60 dark:border-indigo-800/40 px-3 py-1.5 text-xs text-foreground shadow-2xs"
              >
                <span className="font-semibold truncate max-w-[140px]" title={trip.pickupLocation}>
                  {trip.pickupLocation}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="font-semibold truncate max-w-[140px]" title={trip.destination}>
                  {trip.destination}
                </span>
                <Badge variant={trip.status} dot className="scale-90 origin-left">
                  {milestone.shortLabel || milestone.label}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Expanded Trip Cards List                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isExpanded && (
        <div
          id="secondary-active-trips-list"
          className="mt-4 pt-4 border-t border-indigo-200/60 dark:border-indigo-800/50 space-y-3"
        >
          {secondaryTrips.map((trip) => {
            const milestone = getTripLifecycleMilestone(trip.status);
            const resource = trip.assignedResource;

            return (
              <div
                key={trip.legId}
                className="rounded-xl border border-border/80 bg-background p-4 shadow-2xs space-y-3 transition-colors"
              >
                {/* Leg Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      {trip.legType === 'OUTBOUND' ? 'Outbound Leg' : 'Return Leg'}
                    </span>
                    <Badge variant={trip.status} dot>
                      {milestone.label}
                    </Badge>
                  </div>

                  <span className="font-mono text-xs text-muted-foreground">
                    Req ID: {trip.requestId}
                  </span>
                </div>

                {/* Route Vector Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-muted/30 p-3 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                    <span className="font-semibold text-foreground truncate" title={trip.pickupLocation}>
                      {trip.pickupLocation}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-semibold text-foreground truncate" title={trip.destination}>
                      {trip.destination}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-muted-foreground shrink-0 font-medium">
                    <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span>Depart: {formatDisplayDateTime(trip.scheduledDeparture)}</span>
                  </div>
                </div>

                {/* Assigned Resources & Action */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 text-xs">
                  {resource ? (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Car className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        <strong className="text-foreground">{resource.driverName}</strong>
                      </span>
                      <span>•</span>
                      <span className="font-mono font-medium">{resource.vehiclePlate}</span>
                      <span>•</span>
                      <span>{resource.vehicleModel}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">
                      Awaiting vehicle & driver dispatch assignment
                    </span>
                  )}

                  <div className="flex items-center justify-end">
                    {onSelectTrip ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectTrip(trip)}
                        className="min-h-[44px]"
                      >
                        <span>View Leg Details</span>
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    ) : (
                      <Link
                        href={`/employee/requests/${trip.requestId}`}
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' }),
                          'min-h-[44px]'
                        )}
                      >
                        <span>View Request Details</span>
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
