'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Navigation,
  Calendar,
  Activity,
  ArrowRight,
  User,
  Car,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { VehicleRequest, TripLeg, ActivityLog, User as DomainUser, Vehicle, Driver } from '@/types/domain';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDisplayDateTime } from '@/lib/utils/date';
import { TRIP_LIFECYCLE_MILESTONES } from '@/features/vehicle-requests/types/view-models';
import { isActiveTripStatus } from '@/lib/constants/domain';

/**
 * 1. Pending Requests Needing Review
 */
export interface DashboardPendingRequestsProps {
  requests: VehicleRequest[];
  users: DomainUser[];
  tripLegs: TripLeg[];
}

export function DashboardPendingRequestsCard({
  requests,
  users,
  tripLegs,
}: DashboardPendingRequestsProps) {
  const router = useRouter();
  const pending = requests.filter((r) => r.status === 'PENDING').slice(0, 5);

  const userMap = React.useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const legMap = React.useMemo(() => {
    const map = new Map<string, TripLeg>();
    tripLegs.forEach((l) => {
      if (l.legType === 'OUTBOUND') map.set(l.requestId, l);
    });
    return map;
  }, [tripLegs]);

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <span>Pending Requests Needing Review</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Requests awaiting administrative approval or rejection
          </CardDescription>
        </div>
        <Link
          href="/admin/requests?status=PENDING"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>View all ({requests.filter((r) => r.status === 'PENDING').length})</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="pt-1">
        {pending.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No pending requests require review.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {pending.map((req) => {
              const requester = userMap.get(req.requesterId);
              const leg = legMap.get(req.id);
              return (
                <div
                  key={req.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/30 px-2 rounded-md transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {req.id}
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                        {req.tripType === 'ROUND_TRIP' ? 'Round-Trip' : 'One-Way'}
                      </Badge>
                      <span className="text-xs text-foreground font-medium flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {requester?.name || 'Employee'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({req.passengerCount} pax)
                      </span>
                    </div>
                    {leg && (
                      <p className="text-xs text-muted-foreground truncate">
                        {leg.pickupLocation} → {leg.destination}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => router.push(`/admin/requests/${req.id}`)}
                      className="h-8 text-xs px-3 w-full sm:w-auto"
                    >
                      Review
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 2. Active Trips Currently in Transit or Staging
 */
export interface DashboardActiveTripsProps {
  tripLegs: TripLeg[];
  requests: VehicleRequest[];
  vehicles: Vehicle[];
  drivers: Driver[];
  users: DomainUser[];
}

export function DashboardActiveTripsCard({
  tripLegs,
  requests,
  vehicles,
  drivers,
  users,
}: DashboardActiveTripsProps) {
  const router = useRouter();

  const activeLegs = tripLegs.filter((l) => isActiveTripStatus(l.status));

  const reqMap = React.useMemo(() => new Map(requests.map((r) => [r.id, r])), [requests]);
  const userMap = React.useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Navigation className="h-4 w-4 text-violet-600 animate-pulse" aria-hidden="true" />
            <span>Active Trips in Progress</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Live driver-reported journey progression across the fleet
          </CardDescription>
        </div>
        <Link
          href="/admin/trips"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>Trip Monitor ({activeLegs.length})</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="pt-1">
        {activeLegs.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No active vehicles currently en route.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {activeLegs.map((leg) => {
              const req = reqMap.get(leg.requestId);
              const requester = req ? userMap.get(req.requesterId) : undefined;
              const milestone = TRIP_LIFECYCLE_MILESTONES[leg.status];

              return (
                <div
                  key={leg.id}
                  onClick={() => router.push('/admin/trips')}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/30 px-2 rounded-md transition-colors cursor-pointer"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {leg.id}
                      </span>
                      <span className="text-xs text-muted-foreground">for</span>
                      <span className="font-mono text-xs text-foreground font-medium">
                        {leg.requestId}
                      </span>
                      <Badge className="text-[10px] py-0 px-2 bg-violet-100 text-violet-800 border-violet-200">
                        {milestone?.shortLabel || leg.status}
                      </Badge>
                    </div>
                    <p className="text-xs font-medium text-foreground truncate">
                      {leg.pickupLocation} → {leg.destination}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Passenger: {requester?.name || 'Employee'}
                    </p>
                  </div>
                  <div className="text-right sm:flex-shrink-0">
                    <span className="text-[11px] font-mono text-muted-foreground block">
                      Depart: {formatDisplayDateTime(leg.scheduledDeparture)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 3. Recent Administrative & Fleet Activity Audit Trail
 */
export interface DashboardRecentActivityProps {
  activityLogs: ActivityLog[];
  users: DomainUser[];
}

export function DashboardRecentActivityCard({
  activityLogs,
  users,
}: DashboardRecentActivityProps) {
  const userMap = React.useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const recentLogs = [...activityLogs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Recent Fleet Activity</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Immutable chronological audit log of requests, approvals, and dispatch events
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-1">
        {recentLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No activity records found.
          </div>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log) => {
              const actor = userMap.get(log.actorId);
              return (
                <div key={log.id} className="flex items-start gap-3 text-xs">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="text-foreground leading-snug">
                      {log.description}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                      <span>{formatDisplayDateTime(log.timestamp)}</span>
                      <span>•</span>
                      <span>By: {actor?.name || log.actorId}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
