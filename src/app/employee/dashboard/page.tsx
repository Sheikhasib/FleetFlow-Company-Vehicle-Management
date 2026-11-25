'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Car,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  Users,
  FileSpreadsheet,
} from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { formatDisplayDateTime } from '@/lib/utils/date';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import {
  TripSelectorData,
  selectEmployeeTripOverview,
} from '@/features/vehicle-requests/selectors/trip-selectors';
import { ActiveTripCard } from '@/features/vehicle-requests/components/active-trip-card';
import { SecondaryActiveAlert } from '@/features/vehicle-requests/components/secondary-active-alert';
import { DroppedOffTripCard } from '@/features/vehicle-requests/components/dropped-off-trip-card';
import { UpcomingTripCard } from '@/features/vehicle-requests/components/upcoming-trip-card';
import { PastUnfinishedCard } from '@/features/vehicle-requests/components/past-unfinished-card';

export default function EmployeeDashboardPage() {
  const router = useRouter();

  // Zustand single source of truth subscriptions
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const users = useFleetFlowStore((s) => s.users);
  const requests = useFleetFlowStore((s) => s.requests);
  const tripLegs = useFleetFlowStore((s) => s.tripLegs);
  const assignments = useFleetFlowStore((s) => s.assignments);
  const vehicles = useFleetFlowStore((s) => s.vehicles);
  const drivers = useFleetFlowStore((s) => s.drivers);
  const passengers = useFleetFlowStore((s) => s.passengers);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  // User's owned requests
  const userRequests = React.useMemo(() => {
    return requests.filter((r) => r.requesterId === currentUser.id);
  }, [requests, currentUser.id]);

  // KPI Metrics based on user requests
  const totalCount = userRequests.length;
  const pendingCount = userRequests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = userRequests.filter((r) => r.status === 'APPROVED').length;
  const completedCount = userRequests.filter((r) => r.status === 'COMPLETED').length;

  // Stable reference time for deterministic selector evaluation across re-renders
  const [referenceTime] = React.useState<Date>(() => new Date());

  // Aggregate trip overview via pure deterministic selectors
  const overview = React.useMemo(() => {
    const selectorData: TripSelectorData = {
      requests,
      tripLegs,
      assignments,
      vehicles,
      drivers,
      users,
      passengers,
    };
    return selectEmployeeTripOverview(selectorData, currentUser.id, referenceTime);
  }, [
    requests,
    tripLegs,
    assignments,
    vehicles,
    drivers,
    users,
    passengers,
    currentUser.id,
    referenceTime,
  ]);

  // Recent 4 requests
  const recentRequests = React.useMemo(() => {
    return [...userRequests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [userRequests]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="pending">Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="approved">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="rejected">Rejected</Badge>;
      case 'CANCELLED':
        return <Badge variant="cancelled">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      {/* 1. Welcome Banner & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your company vehicle requests and view scheduled transportation.
          </p>
        </div>
        <Button
          onClick={() => router.push('/employee/requests/new')}
          className="flex items-center gap-2 shadow-sm self-start sm:self-center min-h-[44px]"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Vehicle Request</span>
        </Button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Requests */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Total Requests</span>
            <FileSpreadsheet className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">{totalCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Submitted requests</div>
        </Card>

        {/* Pending Review */}
        <Card className="p-4 flex flex-col justify-between border-amber-200/60 bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Review</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-2">{pendingCount}</div>
          <div className="text-[11px] text-amber-800/80 mt-1">Awaiting approval</div>
        </Card>

        {/* Approved */}
        <Card className="p-4 flex flex-col justify-between border-blue-200/60 bg-blue-50/20">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-medium uppercase tracking-wider">Approved</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-2">{approvedCount}</div>
          <div className="text-[11px] text-blue-800/80 mt-1">Ready for dispatch</div>
        </Card>

        {/* Completed */}
        <Card className="p-4 flex flex-col justify-between border-emerald-200/60 bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-medium uppercase tracking-wider">Completed</span>
            <Car className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-2">{completedCount}</div>
          <div className="text-[11px] text-emerald-800/80 mt-1">Finished journeys</div>
        </Card>
      </div>

      {/* 2. Primary Active Journey (Hero Card) */}
      {overview.primaryActiveTrip && (
        <section aria-labelledby="active-trip-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="active-trip-heading" className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" aria-hidden="true" />
              <span>Active Journey</span>
            </h2>
          </div>
          <ActiveTripCard
            trip={overview.primaryActiveTrip}
            onViewDetails={(requestId) => router.push(`/employee/requests/${requestId}`)}
          />
        </section>
      )}

      {/* 3. Additional Active Journeys Notice (Collapsible Banner) */}
      {overview.secondaryActiveTrips.length > 0 && (
        <SecondaryActiveAlert
          secondaryTrips={overview.secondaryActiveTrips}
          onSelectTrip={(trip) => router.push(`/employee/requests/${trip.requestId}`)}
        />
      )}

      {/* 4. Past Unfinished Journeys (Operational Alert) */}
      {overview.pastUnfinishedTrips.length > 0 && (
        <section aria-labelledby="past-unfinished-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="past-unfinished-heading" className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
              <span>Operational Attention Required</span>
            </h2>
            <Badge
              variant="outline"
              className="text-xs font-normal border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30"
            >
              {overview.pastUnfinishedTrips.length} unstarted leg(s)
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {overview.pastUnfinishedTrips.map((trip) => (
              <PastUnfinishedCard
                key={trip.legId}
                trip={trip}
                onViewDetails={(requestId) => router.push(`/employee/requests/${requestId}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. Dropped-Off Journeys (Arrived, Awaiting Administrative Completion) */}
      {overview.droppedOffTrips.length > 0 && (
        <section aria-labelledby="dropped-off-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="dropped-off-heading" className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <span>Arrived at Destination</span>
            </h2>
            <Badge
              variant="outline"
              className="text-xs font-normal border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
            >
              {overview.droppedOffTrips.length} awaiting completion
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {overview.droppedOffTrips.map((trip) => (
              <DroppedOffTripCard
                key={trip.legId}
                trip={trip}
                onViewDetails={(requestId) => router.push(`/employee/requests/${requestId}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 6. Upcoming Scheduled Journeys */}
      {overview.upcomingTrips.length > 0 && (
        <section aria-labelledby="upcoming-trips-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="upcoming-trips-heading" className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
              <span>Upcoming Scheduled Trips</span>
            </h2>
            <Badge variant="outline" className="text-xs font-normal">
              {overview.upcomingTrips.length} leg(s) scheduled
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overview.upcomingTrips.map((trip) => (
              <UpcomingTripCard
                key={trip.legId}
                trip={trip}
                onViewDetails={(requestId) => router.push(`/employee/requests/${requestId}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 7. Recent Requests or First-Time Empty State */}
      <section aria-labelledby="recent-requests-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="recent-requests-heading" className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>Recent Requests</span>
          </h2>
          {userRequests.length > 0 && (
            <Button
              variant="link"
              size="sm"
              onClick={() => router.push('/employee/requests')}
              className="text-xs text-primary p-0 h-auto min-h-[44px] flex items-center"
            >
              View all ({userRequests.length})
            </Button>
          )}
        </div>

        {totalCount === 0 ? (
          <EmptyState
            title="No vehicle requests yet"
            description="Submit your first company vehicle request for travel between corporate facilities or client sites."
            icon={Car}
            actionLabel="Book Your First Trip"
            onAction={() => router.push('/employee/requests/new')}
          />
        ) : recentRequests.length === 0 ? (
          <EmptyState
            title="No recent requests"
            description="You do not have any requests in your recent history."
            actionLabel="Create Request"
            onAction={() => router.push('/employee/requests/new')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {recentRequests.map((req) => (
              <div
                key={req.id}
                onClick={() => router.push(`/employee/requests/${req.id}`)}
                className="p-4 rounded-xl border bg-card shadow-xs hover:border-primary/50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-[44px]"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/employee/requests/${req.id}`);
                  }
                }}
                aria-label={`View request ${req.id}: ${req.purpose}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-primary">{req.id}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {req.tripType === 'ROUND_TRIP' ? 'Round-Trip' : 'One-Way'}
                    </Badge>
                    {renderStatusBadge(req.status)}
                  </div>
                  <div className="text-sm font-medium text-foreground line-clamp-1">
                    {req.purpose}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3">
                    <span>Submitted {formatDisplayDateTime(req.createdAt)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {req.passengerCount} pax
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary self-end sm:self-center min-h-[44px] pointer-events-none"
                  tabIndex={-1}
                >
                  <span>View Details</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
