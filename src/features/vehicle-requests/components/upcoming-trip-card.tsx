'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Car,
  User as UserIcon,
  Phone,
  PhoneOff,
  Users,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { RouteVector } from '@/components/shared/route-vector';
import { formatDisplayDateTime } from '@/lib/utils/date';
import {
  UpcomingTripViewModel,
  getTripLifecycleMilestone,
} from '../types/view-models';

export interface UpcomingTripCardProps {
  trip: UpcomingTripViewModel;
  onViewDetails?: (requestId: string) => void;
  className?: string;
}

/**
 * UpcomingTripCard
 *
 * Presents an approved or assigned future trip (scheduledDeparture > referenceTime).
 * Clearly distinguishes between:
 * - PENDING_ASSIGNMENT (Awaiting resource allocation)
 * - ASSIGNED (Vehicle and driver allocated for future departure)
 *
 * Features:
 * - Prominent scheduled departure display with tabular numerals
 * - Route wayfinding via RouteVector
 * - Resource details when assigned, with tap-to-call link if driverTelUri is valid
 * - Clean neutral unassigned state when resources are awaiting allocation
 * - Does not invent countdowns or imply the assigned vehicle is currently in use
 */
export function UpcomingTripCard({
  trip,
  onViewDetails,
  className,
}: UpcomingTripCardProps) {
  const milestone = getTripLifecycleMilestone(trip.status);
  const resource = trip.assignedResource;
  const isAssigned = trip.status === 'ASSIGNED';

  const legLabel =
    trip.legType === 'OUTBOUND' ? 'Outbound Journey' : 'Return Journey';

  return (
    <Card
      statusRail={trip.status}
      className={cn(
        'overflow-hidden border-border/80 bg-card shadow-xs transition-all hover:shadow-md hover:border-primary/30',
        className
      )}
      role="region"
      aria-label={`Upcoming Journey: ${trip.pickupLocation} to ${trip.destination}`}
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Header: Scheduled Departure & Allocation Status Badge                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground border border-border/70">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
              <span>{formatDisplayDateTime(trip.scheduledDeparture)}</span>
            </span>

            <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold bg-background text-foreground border border-border/60">
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
      {/* Card Content: Route & Resource Allocation                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Route Vector */}
        <RouteVector
          origin={trip.pickupLocation}
          destination={trip.destination}
          scheduledDeparture={trip.scheduledDeparture}
          scheduledArrival={trip.scheduledArrival}
          className="bg-muted/30"
        />

        {/* Resource Allocation Box */}
        {isAssigned && resource ? (
          <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-800/60 p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                Allocated Resources
              </span>
              <span className="font-mono text-[11px] font-medium text-muted-foreground">
                Capacity: {resource.vehicleCapacity} Seats
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              {/* Driver */}
              <div className="flex items-center gap-2.5 rounded-lg bg-background/80 p-2.5 border border-indigo-100 dark:border-indigo-900/60">
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
              <div className="flex items-center gap-2.5 rounded-lg bg-background/80 p-2.5 border border-indigo-100 dark:border-indigo-900/60">
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

            <p className="text-[11px] text-muted-foreground italic">
              Vehicle will be staged and ready for pickup prior to the scheduled departure time.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/50 p-3.5 flex items-start gap-3 text-xs">
            <Clock className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-0.5">
              <div className="font-semibold text-amber-950 dark:text-amber-200">
                Awaiting Vehicle Allocation
              </div>
              <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                Your request is approved. The dispatch team will assign a dedicated vehicle and driver closer to your departure.
              </p>
            </div>
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
