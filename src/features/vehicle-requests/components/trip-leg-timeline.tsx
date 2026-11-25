'use client';

import * as React from 'react';
import {
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Car,
  User as UserIcon,
  Phone,
  PhoneOff,
  Clock,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RequestStatus } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { RouteVector } from '@/components/shared/route-vector';
import { TripLifecycleStepper } from '@/components/shared/trip-lifecycle-stepper';
import {
  TripLegTimelineItemViewModel,
  TRIP_LIFECYCLE_STEPS,
  getTripLifecycleMilestone,
} from '../types/view-models';

export interface TripLegTimelineProps {
  legs: readonly TripLegTimelineItemViewModel[];
  requestStatus?: RequestStatus;
  className?: string;
}

/**
 * TripLegTimeline
 *
 * Presents the complete physical journey itinerary and progress of a vehicle request.
 * Designed for the request detail view.
 *
 * Architectural & UX Principles:
 * - Supports one-way requests (1 leg) and round-trip requests (2 legs: Outbound & Return).
 * - Outbound and Return journeys are visually distinct with clear badges and iconography.
 * - Injects canonical TRIP_LIFECYCLE_STEPS into TripLifecycleStepper without duplicate milestone definitions.
 * - Strictly maintains domain integrity: CANCELLED and REJECTED parent request contexts
 *   are displayed via contextual advisory banners without artificially assigning invalid TripLegStatus values.
 * - Dropped-off (Step 7) and Completed (Step 8) legs remain visually distinct.
 * - Responsive vertical alignment on mobile, connected visual flow on desktop.
 */
export function TripLegTimeline({
  legs,
  requestStatus,
  className,
}: TripLegTimelineProps) {
  if (!legs || legs.length === 0) {
    return (
      <div className={cn('rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground', className)}>
        No journey legs recorded for this request.
      </div>
    );
  }

  const isRoundTrip = legs.length > 1;

  return (
    <div
      role="region"
      aria-label="Journey Itinerary and Execution Timeline"
      className={cn('space-y-6', className)}
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Section Header                                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 className="text-base font-semibold text-foreground">
            Journey Itinerary &amp; Leg Progress
          </h3>
        </div>

        <span className="font-mono text-xs font-semibold text-muted-foreground">
          {isRoundTrip ? 'Round-Trip Booking (2 Legs)' : 'One-Way Booking (1 Leg)'}
        </span>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Timeline Legs List                                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="space-y-6 relative">
        {legs.map((leg, index) => {
          const milestone = getTripLifecycleMilestone(leg.status);
          const isOutbound = leg.legType === 'OUTBOUND';
          const isReturn = leg.legType === 'RETURN';
          const resource = leg.assignedResource;

          const legNumber = index + 1;
          const totalLegs = legs.length;

          return (
            <div key={leg.legId} className="relative">
              {/* Vertical connector line between round-trip legs on tablet/desktop */}
              {index > 0 && (
                <div
                  className="hidden md:flex absolute -top-6 left-1/2 -translate-x-1/2 h-6 items-center justify-center z-10"
                  aria-hidden="true"
                >
                  <div className="h-full w-0.5 border-l-2 border-dashed border-border" />
                  <div className="absolute flex h-5 w-5 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground">
                    <RotateCcw className="h-2.5 w-2.5" />
                  </div>
                </div>
              )}

              <Card
                statusRail={leg.status}
                className="overflow-hidden border-border/80 bg-card shadow-xs transition-colors"
              >
                {/* Leg Card Header */}
                <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Leg Type Badge & Sequence */}
                    <div className="flex items-center gap-2">
                      {isOutbound ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-bold bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-primary-foreground">
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          Outbound Journey {isRoundTrip && `(Leg ${legNumber} of ${totalLegs})`}
                        </span>
                      ) : isReturn ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-bold bg-accent/15 text-accent-foreground border border-accent/30">
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          Return Journey {isRoundTrip && `(Leg ${legNumber} of ${totalLegs})`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-muted text-muted-foreground border border-border">
                          Leg {legNumber}
                        </span>
                      )}

                      <span className="font-mono text-[11px] text-muted-foreground">
                        {leg.legId}
                      </span>
                    </div>

                    {/* Physical Status Badge */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Badge variant={leg.status} dot>
                        {milestone.label}
                      </Badge>
                      <span className="font-mono text-xs font-semibold text-muted-foreground tabular-nums">
                        Step {leg.stepNumber} of 8
                      </span>
                    </div>
                  </div>
                </CardHeader>

                {/* Leg Card Content */}
                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Parent Cancellation Advisory Banner */}
                  {leg.isParentRequestCancelled && (
                    <div className="rounded-xl border border-slate-300 bg-slate-100/80 dark:bg-slate-900/40 dark:border-slate-800 p-3.5 flex items-start gap-3 text-xs text-slate-800 dark:text-slate-200">
                      <XCircle className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="space-y-0.5">
                        <div className="font-semibold">Parent Request Cancelled</div>
                        <p className="text-slate-600 dark:text-slate-400">
                          This request was cancelled prior to departure. Physical journey execution has been halted.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Parent Rejection Advisory Banner */}
                  {leg.isParentRequestRejected && (
                    <div className="rounded-xl border border-rose-300 bg-rose-50/80 dark:bg-rose-950/30 dark:border-rose-900 p-3.5 flex items-start gap-3 text-xs text-rose-950 dark:text-rose-200">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="space-y-0.5">
                        <div className="font-semibold">Parent Request Rejected</div>
                        <p className="text-rose-800 dark:text-rose-300">
                          This request was declined during administrative review. No journey legs were scheduled.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Route Vector */}
                  <RouteVector
                    origin={leg.pickupLocation}
                    destination={leg.destination}
                    scheduledDeparture={leg.scheduledDeparture}
                    scheduledArrival={leg.scheduledArrival}
                    className="bg-muted/30"
                  />

                  {/* Lifecycle Stepper (injected canonical steps) */}
                  <TripLifecycleStepper
                    currentStatus={leg.status}
                    steps={TRIP_LIFECYCLE_STEPS}
                    className="bg-muted/20"
                  />

                  {/* Allocated Resources Info (when available) */}
                  {resource ? (
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          <UserIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                          <span>{resource.driverName}</span>
                        </span>

                        <span>•</span>

                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          <Car className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                          <span>{resource.vehicleModel}</span>
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 rounded bg-background border border-border">
                            {resource.vehiclePlate}
                          </span>
                        </span>
                      </div>

                      {/* Driver phone contact if permitted */}
                      {resource.driverTelUri && resource.driverPhone && leg.status !== 'DROPPED_OFF' && leg.status !== 'COMPLETED' ? (
                        <a
                          href={resource.driverTelUri}
                          aria-label={`Call driver ${resource.driverName} at ${resource.driverPhone}`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline min-h-[36px]"
                        >
                          <Phone className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                          <span className="font-mono">{resource.driverPhone}</span>
                        </a>
                      ) : resource.driverPhone ? (
                        <span className="font-mono text-muted-foreground text-[11px]">
                          {resource.driverPhone}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic px-1">
                      {leg.isParentRequestCancelled || leg.isParentRequestRejected
                        ? 'No resources assigned to this request.'
                        : 'Awaiting dispatch vehicle and driver allocation.'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
