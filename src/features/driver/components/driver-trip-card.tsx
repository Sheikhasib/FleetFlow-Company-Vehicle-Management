import * as React from 'react';
import Link from 'next/link';
import {
  MapPin,
  Clock,
  Users,
  Car,
  ArrowRight,
  User,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DriverTripCardViewModel } from '../types/view-models';
import { formatDisplayDateTime } from '@/lib/utils/date';
import { TRIP_LIFECYCLE_MILESTONES } from '@/features/vehicle-requests/types/view-models';

interface DriverTripCardProps {
  trip: DriverTripCardViewModel;
  isPriorityActive?: boolean;
  isPendingSync?: boolean;
}

export function DriverTripCard({ trip, isPriorityActive = false, isPendingSync = false }: DriverTripCardProps) {
  const milestone = TRIP_LIFECYCLE_MILESTONES[trip.status];

  const getStatusBadge = () => {
    if (isPendingSync) {
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold gap-1">
          <Clock className="h-3 w-3" />
          <span>Pending Sync</span>
        </Badge>
      );
    }

    switch (trip.status) {
      case 'ASSIGNED':
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
            {milestone?.shortLabel || 'Assigned'}
          </Badge>
        );
      case 'ACCEPTED':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            {milestone?.shortLabel || 'Accepted'}
          </Badge>
        );
      case 'ARRIVED_AT_PICKUP':
      case 'PICKED_UP':
      case 'IN_PROGRESS':
      case 'DROPPED_OFF':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold animate-pulse">
            {milestone?.shortLabel || 'In Progress'}
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300">
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{trip.status}</Badge>;
    }
  };

  return (
    <Card
      className={`transition-all ${
        isPriorityActive
          ? 'border-emerald-500/50 shadow-md bg-card ring-1 ring-emerald-500/20'
          : 'border-border hover:border-border/80 shadow-xs'
      }`}
    >
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              {trip.requestId}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${
                trip.legType === 'OUTBOUND'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}
            >
              {trip.legType === 'OUTBOUND' ? 'Outbound' : 'Return'}
            </Badge>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        <CardTitle className="text-base sm:text-lg font-bold text-foreground mt-2 leading-snug">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-primary shrink-0 mt-1" aria-hidden="true" />
            <div>
              <div className="text-sm font-semibold">{trip.pickupLocation}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <span>to</span>
                <span className="font-medium text-foreground">{trip.destination}</span>
              </div>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
        {/* Departure & Passengers Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded-md border border-border/50">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{formatDisplayDateTime(trip.scheduledDeparture)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              {trip.passengerCount} {trip.passengerCount === 1 ? 'Passenger' : 'Passengers'}
            </span>
          </div>
        </div>

        {/* Requester & Vehicle Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-1.5 pt-1">
          <div className="flex items-center gap-1.5 truncate">
            <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="font-medium text-foreground">{trip.requesterName}</span>
            <span className="text-[11px] text-muted-foreground truncate">
              ({trip.requesterDepartment})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Car className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="font-medium text-foreground">{trip.vehicleModel}</span>
            <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded border border-border">
              {trip.vehiclePlate}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 sm:p-5 pt-0 flex justify-end border-t border-border/40 mt-1">
        <Link
          href={`/driver/trips/${trip.legId}`}
          className={cn(
            buttonVariants({ variant: isPriorityActive ? 'default' : 'outline', size: 'sm' }),
            'w-full sm:w-auto min-h-[40px] text-xs font-semibold gap-1.5'
          )}
        >
          <span>{isPriorityActive ? 'Resume Active Trip' : 'View Trip Details'}</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
