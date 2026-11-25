'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Car,
  Users,
  Phone,
  PhoneOff,
  ArrowRight,
  ShieldCheck,
  User as UserIcon,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { RouteVector } from '@/components/shared/route-vector';
import { TripLifecycleStepper } from '@/components/shared/trip-lifecycle-stepper';
import {
  ActiveTripViewModel,
  TRIP_LIFECYCLE_STEPS,
  getTripLifecycleMilestone,
} from '../types/view-models';

export interface ActiveTripCardProps {
  trip: ActiveTripViewModel;
  onViewDetails?: (requestId: string) => void;
  className?: string;
}

/**
 * ActiveTripCard
 *
 * Hero presentation component for the employee's primary active trip.
 * Strictly presents physically active trips (ACCEPTED, ARRIVED_AT_PICKUP, PICKED_UP, IN_PROGRESS).
 *
 * Features:
 * - Clear visual hierarchy and status rail indicator
 * - Reusable RouteVector for origin and destination
 * - Canonical TripLifecycleStepper with injected TRIP_LIFECYCLE_STEPS
 * - Verified driver contact details with tap-to-call link (only when driverTelUri is valid)
 * - Safe unavailable contact state without broken links
 * - Passenger headcount and traveling colleague chips
 * - Responsive layout adapted for mobile, tablet, and desktop
 */
export function ActiveTripCard({
  trip,
  onViewDetails,
  className,
}: ActiveTripCardProps) {
  const milestone = getTripLifecycleMilestone(trip.status);
  const resource = trip.assignedResource;

  const legLabel =
    trip.legType === 'OUTBOUND' ? 'Outbound Journey' : 'Return Journey';

  return (
    <Card
      statusRail={trip.status}
      className={cn(
        'overflow-hidden border-border/80 bg-card shadow-sm transition-all hover:shadow-md',
        className
      )}
      role="region"
      aria-label={`Active Trip: ${trip.pickupLocation} to ${trip.destination}`}
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Card Header: Operational Badges & Live Status                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/60 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left: Active Indicator & Leg Type */}
          <div className="flex flex-wrap items-center gap-2">
            {trip.isPrimary && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
                <span
                  className="h-2 w-2 rounded-full bg-purple-600 dark:bg-purple-400 motion-safe:animate-pulse"
                  aria-hidden="true"
                />
                Active Journey
              </span>
            )}

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

          {/* Right: Milestone Badge & Step Count */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant={trip.status} dot>
              {milestone.label}
            </Badge>
            <span className="font-mono text-xs font-semibold text-muted-foreground tabular-nums">
              Step {trip.stepNumber} of 8
            </span>
          </div>
        </div>
      </CardHeader>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Card Body: Route, Lifecycle Stepper, and Assigned Resources        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Route Wayfinding */}
        <RouteVector
          origin={trip.pickupLocation}
          destination={trip.destination}
          scheduledDeparture={trip.scheduledDeparture}
          scheduledArrival={trip.scheduledArrival}
          className="bg-muted/30"
        />

        {/* 8-State Canonical Execution Stepper */}
        <TripLifecycleStepper
          currentStatus={trip.status}
          steps={TRIP_LIFECYCLE_STEPS}
          className="bg-muted/20"
        />

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* Resource Allocation: Driver & Vehicle Verification                */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Dispatched Resources
            </h4>
            {resource && (
              <span className="font-mono text-[11px] font-semibold text-muted-foreground uppercase">
                Capacity: {resource.vehicleCapacity} Seats
              </span>
            )}
          </div>

          {resource ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Driver Details Box */}
              <div className="flex items-start gap-3 rounded-lg bg-muted/30 p-3 border border-border/50">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5"
                  aria-hidden="true"
                >
                  <UserIcon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                    Assigned Driver
                  </div>
                  <div
                    className="font-semibold text-sm text-foreground truncate"
                    title={resource.driverName}
                  >
                    {resource.driverName}
                  </div>

                  {/* Tap-to-Call Link (rendered ONLY when valid driverTelUri is available) */}
                  {resource.driverTelUri && resource.driverPhone ? (
                    <a
                      href={resource.driverTelUri}
                      aria-label={`Call driver ${resource.driverName} at ${resource.driverPhone}`}
                      className="inline-flex items-center gap-2 min-h-[44px] py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded transition-colors"
                    >
                      <Phone
                        className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                        aria-hidden="true"
                      />
                      <span className="font-mono tabular-nums">{resource.driverPhone}</span>
                    </a>
                  ) : resource.driverPhone ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                      <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="font-mono tabular-nums">{resource.driverPhone}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 italic py-1">
                      <PhoneOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>Contact number unavailable</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Details Box */}
              <div className="flex items-start gap-3 rounded-lg bg-muted/30 p-3 border border-border/50">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5"
                  aria-hidden="true"
                >
                  <Car className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                    Assigned Vehicle
                  </div>
                  <div
                    className="font-semibold text-sm text-foreground truncate"
                    title={resource.vehicleModel}
                  >
                    {resource.vehicleModel}
                  </div>
                  <div className="pt-0.5">
                    <span className="inline-block font-mono text-xs font-bold px-2 py-0.5 rounded bg-background border border-border shadow-2xs">
                      {resource.vehiclePlate}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/40 border border-border/60">
              <Car className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>Resource details are currently being synchronized with dispatch.</span>
            </div>
          )}
        </div>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* Passenger & Colleague Details                                      */}
        {/* ───────────────────────────────────────────────────────────────── */}
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
      {/* Card Footer: View Details Action Link                               */}
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
