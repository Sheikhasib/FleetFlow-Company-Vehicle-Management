'use client';

import * as React from 'react';
import { MapPin, CircleDot, ArrowRight, ArrowDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDisplayDateTime } from '@/lib/utils/date';

export interface RouteVectorProps {
  origin: string;
  destination: string;
  originDescriptor?: string;
  destinationDescriptor?: string;
  scheduledDeparture: string;
  scheduledArrival?: string | null;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * Formats an ISO string or pre-formatted date string safely for display.
 * Returns null if the value is empty or invalid.
 */
function formatTimeSafely(val: string | null | undefined): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  // If it's an ISO string containing 'T', use project's formatDisplayDateTime
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return formatDisplayDateTime(trimmed);
    }
  }

  // Otherwise, return trimmed string as provided
  return trimmed;
}

/**
 * RouteVector
 *
 * Standardized transit wayfinding component representing a journey origin and destination.
 * Displays physical endpoints with distinct visual hierarchy, facility descriptors,
 * and verified departure/arrival times.
 *
 * Never fabricates or infers arrival times.
 * Supports horizontal (desktop/tablet) and vertical (mobile-friendly) layouts.
 */
export function RouteVector({
  origin,
  destination,
  originDescriptor,
  destinationDescriptor,
  scheduledDeparture,
  scheduledArrival,
  orientation,
  className,
}: RouteVectorProps) {
  const departureFormatted = formatTimeSafely(scheduledDeparture);
  const arrivalFormatted = formatTimeSafely(scheduledArrival);

  // Determine layout orientation: explicit prop takes precedence, otherwise responsive
  const isExplicitVertical = orientation === 'vertical';
  const isExplicitHorizontal = orientation === 'horizontal';

  return (
    <div
      role="region"
      aria-label={`Transit route from ${origin} to ${destination}`}
      className={cn(
        'rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-colors',
        className
      )}
    >
      {/* Screen-reader descriptive summary */}
      <div className="sr-only">
        Route Origin: {origin}
        {originDescriptor ? ` (${originDescriptor})` : ''}, scheduled departure at{' '}
        {departureFormatted || scheduledDeparture}. Route Destination: {destination}
        {destinationDescriptor ? ` (${destinationDescriptor})` : ''}
        {arrivalFormatted
          ? `, estimated arrival at ${arrivalFormatted}`
          : ', arrival time not specified'}
        .
      </div>

      <div
        className={cn(
          'w-full',
          isExplicitVertical && 'flex flex-col gap-4',
          isExplicitHorizontal && 'flex flex-row items-center justify-between gap-4',
          !orientation && 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'
        )}
      >
        {/* Origin Node */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs ring-4 ring-emerald-100 dark:ring-emerald-950/50 mt-0.5"
            aria-hidden="true"
          >
            <CircleDot className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
                Origin
              </span>
              {originDescriptor && (
                <span
                  className="truncate text-xs text-muted-foreground font-medium"
                  title={originDescriptor}
                >
                  {originDescriptor}
                </span>
              )}
            </div>

            <h4
              className="text-sm sm:text-base font-semibold text-foreground leading-snug break-words"
              title={origin}
            >
              {origin}
            </h4>

            {departureFormatted && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pt-0.5">
                <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-foreground/80">Depart:</strong>{' '}
                  {departureFormatted}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Directional Transit Connector */}
        <div
          className={cn(
            'flex items-center justify-center shrink-0',
            isExplicitVertical && 'py-1 pl-4',
            isExplicitHorizontal && 'px-3',
            !orientation && 'py-1 pl-4 sm:py-0 sm:pl-0 sm:px-3'
          )}
          aria-hidden="true"
        >
          {/* Vertical indicator for mobile / explicit vertical */}
          <div
            className={cn(
              'items-center gap-2',
              isExplicitVertical && 'flex flex-col',
              isExplicitHorizontal && 'hidden',
              !orientation && 'flex flex-col sm:hidden'
            )}
          >
            <div className="h-6 w-0.5 border-l-2 border-dashed border-border" />
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground border border-border">
              <ArrowDown className="h-3 w-3" />
            </div>
            <div className="h-6 w-0.5 border-l-2 border-dashed border-border" />
          </div>

          {/* Horizontal indicator for desktop / explicit horizontal */}
          <div
            className={cn(
              'items-center gap-2 w-20 md:w-28',
              isExplicitHorizontal && 'flex',
              isExplicitVertical && 'hidden',
              !orientation && 'hidden sm:flex'
            )}
          >
            <div className="h-0.5 flex-1 border-t-2 border-dashed border-border" />
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground border border-border shrink-0 shadow-2xs">
              <ArrowRight className="h-3 w-3" />
            </div>
            <div className="h-0.5 flex-1 border-t-2 border-dashed border-border" />
          </div>
        </div>

        {/* Destination Node */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs ring-4 ring-primary/20 mt-0.5"
            aria-hidden="true"
          >
            <MapPin className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-primary-foreground/90">
                Destination
              </span>
              {destinationDescriptor && (
                <span
                  className="truncate text-xs text-muted-foreground font-medium"
                  title={destinationDescriptor}
                >
                  {destinationDescriptor}
                </span>
              )}
            </div>

            <h4
              className="text-sm sm:text-base font-semibold text-foreground leading-snug break-words"
              title={destination}
            >
              {destination}
            </h4>

            {arrivalFormatted ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pt-0.5">
                <Clock className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-foreground/80">Est. Arrival:</strong>{' '}
                  {arrivalFormatted}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/75 font-normal pt-0.5 italic">
                <span>Arrival time to be updated upon dispatch</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
