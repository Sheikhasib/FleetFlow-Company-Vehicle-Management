import * as React from 'react';
import Link from 'next/link';
import {
  Navigation,
  MapPin,
  Clock,
  Users,
  Car,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DriverTripCardViewModel } from '../types/view-models';
import { TRIP_LIFECYCLE_MILESTONES } from '@/features/vehicle-requests/types/view-models';
import { formatDisplayDateTime } from '@/lib/utils/date';

interface DriverActiveHeroProps {
  trip: DriverTripCardViewModel;
  isPendingSync?: boolean;
}

export function DriverActiveHero({ trip, isPendingSync = false }: DriverActiveHeroProps) {
  const milestone = TRIP_LIFECYCLE_MILESTONES[trip.status];

  return (
    <Card className="border-2 border-primary/40 bg-card shadow-md overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-primary to-blue-500" />

      <CardHeader className="p-4 sm:p-6 pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
              Active In-Flight Journey
            </span>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
              {trip.legType}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {isPendingSync ? (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold text-xs px-2.5 py-0.5 shadow-xs">
                Pending Sync
              </Badge>
            ) : (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-2.5 py-0.5 shadow-xs">
                {milestone?.shortLabel || trip.status}
              </Badge>
            )}
          </div>
        </div>

        {/* Route Details */}
        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-primary ring-4 ring-primary/20" />
              <div className="w-0.5 h-8 bg-border my-0.5" />
              <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Pickup Location
                </span>
                <span className="text-base sm:text-lg font-bold text-foreground">
                  {trip.pickupLocation}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Destination
                </span>
                <span className="text-base sm:text-lg font-bold text-foreground">
                  {trip.destination}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-muted/40 p-3 rounded-lg border border-border/60 text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
              Departure
            </span>
            <span className="font-medium text-foreground">
              {formatDisplayDateTime(trip.scheduledDeparture)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
              Passengers
            </span>
            <span className="font-medium text-foreground">
              {trip.passengerCount} {trip.passengerCount === 1 ? 'person' : 'passengers'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
              Requester
            </span>
            <span className="font-medium text-foreground truncate block">
              {trip.requesterName}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
              Vehicle
            </span>
            <span className="font-mono font-medium text-foreground">
              {trip.vehiclePlate}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 sm:p-6 pt-0">
        <Link
          href={`/driver/trips/${trip.legId}`}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'w-full h-14 text-base font-bold shadow-md gap-2'
          )}
        >
          <Navigation className="h-5 w-5" aria-hidden="true" />
          <span>Open Trip Execution Console</span>
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
