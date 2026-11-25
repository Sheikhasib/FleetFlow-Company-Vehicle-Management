'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Car,
  Clock,
  Calendar,
  CheckCircle2,
  Navigation,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { selectDriverDashboardOverview } from '@/features/driver/selectors/driver-selectors';
import { DriverActiveHero } from '@/features/driver/components/driver-active-hero';
import { DriverTripCard } from '@/features/driver/components/driver-trip-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDisplayDate } from '@/lib/utils/date';

export default function DriverDashboardPage() {
  const isHydrated = useFleetFlowStore((s) => s.isHydrated);
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const users = useFleetFlowStore((s) => s.users);
  const drivers = useFleetFlowStore((s) => s.drivers);
  const vehicles = useFleetFlowStore((s) => s.vehicles);
  const requests = useFleetFlowStore((s) => s.requests);
  const tripLegs = useFleetFlowStore((s) => s.tripLegs);
  const assignments = useFleetFlowStore((s) => s.assignments);
  const pendingActions = useFleetFlowStore((s) => s.pendingActions);

  const currentUser = users.find((u) => u.id === currentUserId);
  const currentDriver = drivers.find((d) => d.userId === currentUserId);

  const [referenceTime] = React.useState<Date>(() => new Date());

  const pendingLegIds = React.useMemo(() => {
    return new Set(
      pendingActions
        .filter((a) => a.actorUserId === currentUserId && (a.status === 'PENDING' || a.status === 'SYNCING'))
        .map((a) => a.tripLegId)
    );
  }, [pendingActions, currentUserId]);

  const selectorState = React.useMemo(
    () => ({
      users,
      drivers,
      vehicles,
      requests,
      tripLegs,
      assignments,
    }),
    [users, drivers, vehicles, requests, tripLegs, assignments]
  );

  const overview = React.useMemo(() => {
    if (!currentUserId) {
      return {
        activeTrip: null,
        todayTrips: [],
        upcomingTrips: [],
        completedTrips: [],
        stats: { assignedCount: 0, activeCount: 0, todayCount: 0, completedCount: 0 },
      };
    }
    return selectDriverDashboardOverview(selectorState, currentUserId, referenceTime);
  }, [selectorState, currentUserId, referenceTime]);

  if (!isHydrated) {
    return (
      <div className="container max-w-full md:max-w-4xl lg:max-w-6xl mx-auto py-8 px-4 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground font-medium">Loading driver dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-full md:max-w-4xl lg:max-w-6xl mx-auto py-4 sm:py-6 md:py-8 px-4 sm:px-6 md:px-6 lg:px-8 space-y-6">
      {/* 1. Cockpit Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Driver Operations Cockpit
            </h1>
            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 font-semibold ${
                currentDriver?.status === 'ON_TRIP'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {currentDriver?.status === 'ON_TRIP' ? 'ON TRIP' : 'AVAILABLE'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, <span className="font-semibold text-foreground">{currentUser?.name || 'Driver'}</span>. Shift schedule and journey assignments for{' '}
            <span className="font-medium text-foreground">{formatDisplayDate(referenceTime.toISOString())}</span>.
          </p>
        </div>

        <Link
          href="/driver/trips"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'hidden sm:flex gap-1.5 shrink-0'
          )}
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          <span>Full Trip Roster</span>
        </Link>
      </div>

      {/* 2. Quick Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3.5 sm:p-4 bg-card border-border shadow-xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Active Journey
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold text-foreground">{overview.stats.activeCount}</span>
            <span className="text-xs text-emerald-600 font-medium">In Transit</span>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 bg-card border-border shadow-xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Today&apos;s Queue
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold text-foreground">{overview.stats.todayCount}</span>
            <span className="text-xs text-blue-600 font-medium">Scheduled</span>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 bg-card border-border shadow-xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Assigned Ahead
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold text-foreground">{overview.stats.assignedCount}</span>
            <span className="text-xs text-indigo-600 font-medium">Pending Acceptance</span>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 bg-card border-border shadow-xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Completed Trips
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold text-foreground">{overview.stats.completedCount}</span>
            <span className="text-xs text-muted-foreground font-medium">Historical</span>
          </div>
        </Card>
      </div>

      {/* 3. Active Trip Hero Card (Single Prominent Hero if In Flight) */}
      {overview.activeTrip && (
        <section aria-labelledby="active-trip-heading" className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 id="active-trip-heading" className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Navigation className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span>Current In-Flight Mission</span>
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              Requires continuous milestone reporting
            </span>
          </div>
          <DriverActiveHero
            trip={overview.activeTrip}
            isPendingSync={pendingLegIds.has(overview.activeTrip.legId)}
          />
        </section>
      )}

      {/* 4. Today's Scheduled Assignments */}
      <section aria-labelledby="today-trips-heading" className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 id="today-trips-heading" className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Today&apos;s Departure Queue ({overview.todayTrips.length})</span>
          </h2>
          <span className="text-xs text-muted-foreground">
            Awaiting acceptance or staging
          </span>
        </div>

        {overview.todayTrips.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No More Assignments Scheduled Today"
            description="You have no further pending trip assignments scheduled for today's shift."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overview.todayTrips.map((trip) => (
              <DriverTripCard
                key={trip.legId}
                trip={trip}
                isPendingSync={pendingLegIds.has(trip.legId)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. Upcoming Trips Queue */}
      <section aria-labelledby="upcoming-trips-heading" className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 id="upcoming-trips-heading" className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Upcoming Assignments ({overview.upcomingTrips.length})</span>
          </h2>
          <Link
            href="/driver/trips?tab=UPCOMING"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs gap-1')}
          >
            <span>View All Upcoming</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {overview.upcomingTrips.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Future Trips Queued"
            description="No upcoming future journeys are currently assigned to your driver profile."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overview.upcomingTrips.slice(0, 4).map((trip) => (
              <DriverTripCard
                key={trip.legId}
                trip={trip}
                isPendingSync={pendingLegIds.has(trip.legId)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 6. Completed History Quick Link */}
      {overview.completedTrips.length > 0 && (
        <section aria-labelledby="completed-trips-heading" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 id="completed-trips-heading" className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>Recent Completed Journeys ({overview.completedTrips.length})</span>
            </h2>
            <Link
              href="/driver/trips?tab=COMPLETED"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs gap-1')}
            >
              <span>View Full History</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overview.completedTrips.slice(0, 2).map((trip) => (
              <DriverTripCard
                key={trip.legId}
                trip={trip}
                isPendingSync={pendingLegIds.has(trip.legId)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
