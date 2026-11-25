'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Car,
  Users,
  ArrowRight,
  ShieldCheck,
  User as UserIcon,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { RouteVector } from '@/components/shared/route-vector';
import { TripLifecycleStepper } from '@/components/shared/trip-lifecycle-stepper';
import {
  DroppedOffTripViewModel,
  TRIP_LIFECYCLE_STEPS,
} from '../types/view-models';

export interface DroppedOffTripCardProps {
  trip: DroppedOffTripViewModel;
  onViewDetails?: (requestId: string) => void;
  className?: string;
}

/**
 * DroppedOffTripCard
 *
 * Presents a trip leg that has reached its destination but has not yet been formally closed.
 * Strictly communicates Step 7 of 8 (87.5% progress).
 *
 * Architectural & UX Principles:
 * - Distinguishes DROPPED_OFF from active in-transit journeys and completed archive records.
 * - Suppresses driver call action (passenger has arrived at destination; contact is unnecessary).
 * - Clear text explanation accompanied by verified operational badges.
 * - Reuses RouteVector and canonical TripLifecycleStepper.
 */
export function DroppedOffTripCard({
  trip,
  onViewDetails,
  className,
}: DroppedOffTripCardProps) {
  const resource = trip.assignedResource;
  const legLabel =
    trip.legType === 'OUTBOUND' ? 'Outbound Journey' : 'Return Journey';

  return (
    <Card
      statusRail="DROPPED_OFF"
      className={cn(
        'overflow-hidden border-border/80 bg-card shadow-xs transition-all hover:shadow-md',
        className
      )}
      role="region"
      aria-label={`Dropped-Off Journey: ${trip.pickupLocation} to ${trip.destination}`}
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Header: Status and Operational Milestone Tag                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/60 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-cyan-100 text-cyan-900 border border-cyan-200/80 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-700 dark:text-cyan-400" aria-hidden="true" />
              Destination Reached
            </span>

            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-muted text-muted-foreground border border-border/70">
              {legLabel}
            </span>

            {trip.purpose && (
              <span
                className="truncate max-w-[220px] text-xs font-medium text-muted-foreground hidden md:inline-block"
                title={trip.purpose}
              >
                • {trip.purpose}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant="DROPPED_OFF" dot>
              Arrived at Destination
            </Badge>
            <span className="font-mono text-xs font-semibold text-muted-foreground tabular-nums">
              Step 7 of 8
            </span>
          </div>
        </div>
      </CardHeader>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Card Content                                                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Operational Status Advisory Banner */}
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 dark:bg-cyan-950/20 dark:border-cyan-800/60 p-3.5 flex items-start gap-3 text-xs">
          <Info className="h-4 w-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            <div className="font-semibold text-cyan-950 dark:text-cyan-200">
              Awaiting Administrative Journey Closure
            </div>
            <p className="text-cyan-800/90 dark:text-cyan-300/80 leading-relaxed">
              Passengers have arrived safely at the destination. The driver has logged completion, and this trip record is awaiting formal closure by fleet dispatch.
            </p>
          </div>
        </div>

        {/* Route Wayfinding */}
        <RouteVector
          origin={trip.pickupLocation}
          destination={trip.destination}
          scheduledDeparture={trip.scheduledDeparture}
          scheduledArrival={trip.scheduledArrival}
          className="bg-muted/30"
        />

        {/* 8-State Canonical Execution Stepper (Shows Step 7: Dropped Off) */}
        <TripLifecycleStepper
          currentStatus="DROPPED_OFF"
          steps={TRIP_LIFECYCLE_STEPS}
          className="bg-muted/20"
        />

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* Dispatched Resources Metadata (Call button deliberately suppressed) */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Dispatched Journey Resources
            </h4>
            {resource && (
              <span className="font-mono text-[11px] font-semibold text-muted-foreground uppercase">
                Capacity: {resource.vehicleCapacity} Seats
              </span>
            )}
          </div>

          {resource ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
              {/* Driver Box */}
              <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3 border border-border/50">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                    Journey Driver
                  </div>
                  <div className="font-semibold text-foreground truncate" title={resource.driverName}>
                    {resource.driverName}
                  </div>
                </div>
              </div>

              {/* Vehicle Box */}
              <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3 border border-border/50">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  <Car className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                    Assigned Vehicle
                  </div>
                  <div className="font-semibold text-foreground truncate" title={resource.vehicleModel}>
                    {resource.vehicleModel}
                  </div>
                  <div className="pt-0.5">
                    <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-background border border-border">
                      {resource.vehiclePlate}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic p-2">
              Resource details recorded with completed trip log.
            </div>
          )}
        </div>

        {/* Passenger Information */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground border-t border-border/50">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="font-medium text-foreground">
              {trip.passengerCount} {trip.passengerCount === 1 ? 'Passenger' : 'Passengers'}
            </span>
            {trip.colleagues.length > 0 && (
              <span className="text-muted-foreground truncate max-w-xs">
                (Traveling with: {trip.colleagues.join(', ')})
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
      <CardFooter className="p-4 sm:p-6 pt-0 flex items-center justify-end">
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
