'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Clock,
  Car,
  User as UserIcon,
  Phone,
  PhoneOff,
  Users,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { RouteVector } from '@/components/shared/route-vector';
import { formatDisplayDateTime } from '@/lib/utils/date';
import {
  PastUnfinishedTripViewModel,
  getTripLifecycleMilestone,
} from '../types/view-models';

export interface PastUnfinishedCardProps {
  trip: PastUnfinishedTripViewModel;
  onViewDetails?: (requestId: string) => void;
  className?: string;
}

/**
 * PastUnfinishedCard
 *
 * Presents scheduled trips whose departure time has passed while remaining in an unstarted status.
 * (scheduledDeparture <= referenceTime, status in PENDING_ASSIGNMENT or ASSIGNED).
 *
 * Operational & UX Principles:
 * - Honest, objective communication: Scheduled departure time has passed.
 * - ZERO fabricated claims: Does not invent unverified reasons (e.g. traffic or breakdowns).
 * - Distinguishes between PENDING_ASSIGNMENT (unallocated) and ASSIGNED (allocated but unstarted).
 * - Shows route, scheduled departure, and driver/vehicle details where available.
 * - Does NOT provide unauthorized cancellation or reassignment actions (preserves domain rules).
 */
export function PastUnfinishedCard({
  trip,
  onViewDetails,
  className,
}: PastUnfinishedCardProps) {
  const milestone = getTripLifecycleMilestone(trip.status);
  const resource = trip.assignedResource;
  const isAssigned = trip.status === 'ASSIGNED';

  const legLabel =
    trip.legType === 'OUTBOUND' ? 'Outbound Journey' : 'Return Journey';

  return (
    <Card
      statusRail="PENDING_ASSIGNMENT"
      className={cn(
        'overflow-hidden border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-800 shadow-xs transition-all hover:shadow-md',
        className
      )}
      role="region"
      aria-label={`Unstarted Schedule: ${trip.pickupLocation} to ${trip.destination}`}
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Header: Operational Advisory Tag & Badge                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-amber-200/80 dark:border-amber-900/60 bg-amber-100/40 dark:bg-amber-950/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-amber-200 text-amber-950 border border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700">
              <AlertCircle className="h-3.5 w-3.5 text-amber-800 dark:text-amber-300" aria-hidden="true" />
              Scheduled Time Passed
            </span>

            <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold bg-background text-foreground border border-border/70">
              {legLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant={trip.status} dot>
              {milestone.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Content                                                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Objective Advisory Notice */}
        <div className="rounded-xl border border-amber-300/80 bg-background/90 p-3.5 flex items-start gap-3 text-xs shadow-2xs">
          <Clock className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <div className="font-semibold text-foreground">
              Scheduled Departure Was at {formatDisplayDateTime(trip.scheduledDeparture)}
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {isAssigned
                ? 'A vehicle and driver have been allocated, but the journey has not yet been logged as accepted or in transit by the driver.'
                : 'This trip is approved, but the vehicle and driver allocation has not yet been completed by dispatch.'}
            </p>
          </div>
        </div>

        {/* Route Vector */}
        <RouteVector
          origin={trip.pickupLocation}
          destination={trip.destination}
          scheduledDeparture={trip.scheduledDeparture}
          scheduledArrival={trip.scheduledArrival}
          className="bg-background/80"
        />

        {/* Resource Information (if allocated) */}
        {isAssigned && resource ? (
          <div className="rounded-xl border border-border/80 bg-background p-3.5 space-y-2 text-xs">
            <div className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
              Allocated Resources
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Driver */}
              <div className="flex items-center gap-2.5 rounded-lg bg-muted/40 p-2.5 border border-border/50">
                <UserIcon className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground truncate" title={resource.driverName}>
                    {resource.driverName}
                  </div>
                  {resource.driverTelUri && resource.driverPhone ? (
                    <a
                      href={resource.driverTelUri}
                      aria-label={`Call driver ${resource.driverName} at ${resource.driverPhone}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 hover:underline min-h-[32px] py-0.5"
                    >
                      <Phone className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                      <span className="font-mono">{resource.driverPhone}</span>
                    </a>
                  ) : resource.driverPhone ? (
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {resource.driverPhone}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground italic">
                      Contact pending
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle */}
              <div className="flex items-center gap-2.5 rounded-lg bg-muted/40 p-2.5 border border-border/50">
                <Car className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground truncate" title={resource.vehicleModel}>
                    {resource.vehicleModel}
                  </div>
                  <div className="font-mono font-bold text-[11px] text-muted-foreground">
                    {resource.vehiclePlate}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic p-2 bg-background/50 rounded-lg border border-border/60">
            Awaiting dispatch coordination. If your journey is time-critical, please contact your fleet coordinator directly.
          </div>
        )}

        {/* Passenger Information */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground border-t border-border/50">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="font-medium text-foreground">
              {trip.passengerCount} {trip.passengerCount === 1 ? 'Passenger' : 'Passengers'}
            </span>
            {trip.colleagues.length > 0 && (
              <span className="text-muted-foreground truncate max-w-xs">
                (With: {trip.colleagues.join(', ')})
              </span>
            )}
          </div>

          <div className="font-mono text-[11px] text-muted-foreground">
            Req ID: {trip.requestId}
          </div>
        </div>
      </CardContent>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Footer                                                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <CardFooter className="p-4 sm:p-5 pt-0 flex items-center justify-end">
        {onViewDetails ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px] min-w-[140px] font-semibold"
            onClick={() => onViewDetails(trip.requestId)}
          >
            <span>View Request Details</span>
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Link
            href={`/employee/requests/${trip.requestId}`}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'min-h-[44px] min-w-[140px] font-semibold'
            )}
          >
            <span>View Request Details</span>
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
