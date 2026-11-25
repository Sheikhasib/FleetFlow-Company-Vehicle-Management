'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  FileText,
  AlertTriangle,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { VehicleRequest, RequestStatus } from '@/types/domain';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { requestService } from '@/services/request-service';
import { formatDisplayDateTime } from '@/lib/utils/date';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  TripSelectorData,
  selectTripLegTimeline,
} from '@/features/vehicle-requests/selectors/trip-selectors';
import { selectActivityTimeline } from '@/features/vehicle-requests/selectors/activity-selectors';
import { TripLegTimeline } from './trip-leg-timeline';
import { ActivityTimeline } from './activity-timeline';

export interface RequestDetailCardProps {
  request: VehicleRequest;
}

export function RequestDetailCard({ request }: RequestDetailCardProps) {
  const router = useRouter();

  // Zustand store subscriptions
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const requests = useFleetFlowStore((s) => s.requests);
  const tripLegs = useFleetFlowStore((s) => s.tripLegs);
  const passengers = useFleetFlowStore((s) => s.passengers);
  const assignments = useFleetFlowStore((s) => s.assignments);
  const vehicles = useFleetFlowStore((s) => s.vehicles);
  const drivers = useFleetFlowStore((s) => s.drivers);
  const users = useFleetFlowStore((s) => s.users);
  const activityLogs = useFleetFlowStore((s) => s.activityLogs);

  const [cancelModalOpen, setCancelModalOpen] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  // Associated data
  const reqPassengers = passengers.filter((p) => p.requestId === request.id);
  const requester = users.find((u) => u.id === request.requesterId);

  const isRequester = currentUserId === request.requesterId;
  const isPending = request.status === 'PENDING';

  // Compute TripLeg timeline items via pure deterministic selector
  const timelineLegs = React.useMemo(() => {
    const selectorData: TripSelectorData = {
      requests,
      tripLegs,
      assignments,
      vehicles,
      drivers,
      users,
      passengers,
    };
    return selectTripLegTimeline(selectorData, request.id);
  }, [requests, tripLegs, assignments, vehicles, drivers, users, passengers, request.id]);

  // Compute Activity Timeline items via pure deterministic selector
  const activityTimelineItems = React.useMemo(() => {
    return selectActivityTimeline(
      {
        activityLogs,
        users,
        tripLegs,
      },
      request.id
    );
  }, [activityLogs, users, tripLegs, request.id]);

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    setCancelError(null);
    try {
      await requestService.cancelRequest(request.id, currentUserId);
      setCancelModalOpen(false);
      router.refresh();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel request');
    } finally {
      setIsCancelling(false);
    }
  };

  const renderStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="pending">Pending Review</Badge>;
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
    <div className="space-y-6">
      {/* 1. Request Identity & Parent Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/employee/requests')}
              className="h-8 px-2 text-xs min-h-[44px] flex items-center"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              All Requests
            </Button>
            <span className="text-muted-foreground">•</span>
            <span className="font-mono text-sm font-semibold text-primary">{request.id}</span>
            {renderStatusBadge(request.status)}
          </div>
          <p className="text-xs text-muted-foreground">
            Submitted {formatDisplayDateTime(request.createdAt)}
          </p>
        </div>

        {/* Cancellation Action (Visible & enabled only if PENDING and owned by requester) */}
        {isPending && isRequester && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setCancelModalOpen(true)}
            className="self-start sm:self-center min-h-[44px]"
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Cancel Request
          </Button>
        )}
      </div>

      {/* Rejection Alert if REJECTED */}
      {request.status === 'REJECTED' && (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <CardTitle className="text-base text-destructive">Request Rejected</CardTitle>
                <CardDescription className="text-destructive/90 mt-1">
                  Reason provided:{' '}
                  <strong>{request.rejectionReason || 'No specific reason provided.'}</strong>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* 2. Request Details: Purpose & Special Instructions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <FileText className="h-5 w-5" />
            <CardTitle>Business Justification & Notes</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Purpose
            </div>
            <p className="text-foreground bg-muted/20 p-3 rounded-lg border">{request.purpose}</p>
          </div>

          {request.notes && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Special Instructions
              </div>
              <p className="text-foreground bg-muted/20 p-3 rounded-lg border">{request.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2b. Request Details: Passenger Manifest */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Users className="h-5 w-5" />
              <CardTitle>Passenger Manifest ({request.passengerCount})</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {request.passengerCount} Total
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Primary Requester */}
          <div className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                #1
              </div>
              <div>
                <div className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span>{requester?.name || 'Requester'}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Primary Passenger
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {requester?.department || 'Employee'} • {requester?.email}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Colleagues */}
          {reqPassengers.map((colleague, idx) => (
            <div
              key={colleague.id}
              className="p-3 rounded-lg border bg-card flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                  #{idx + 2}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{colleague.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {colleague.department ? colleague.department : 'Colleague'}
                    {colleague.employeeId ? ` • ID: ${colleague.employeeId}` : ''}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 3. Trip Itinerary & Independent Leg Progress (Canonical TripLegTimeline) */}
      <section aria-label="Trip Itinerary and Progress">
        <TripLegTimeline legs={timelineLegs} requestStatus={request.status} />
      </section>

      {/* 4. Activity & Audit History Timeline */}
      <section aria-label="Request Activity and Audit History">
        <ActivityTimeline items={activityTimelineItems} />
      </section>

      {/* 5. Cancellation Confirmation Dialog */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent onClose={() => setCancelModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Cancel Vehicle Request?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel request <strong>{request.id}</strong>? Once cancelled,
              this request cannot be reopened or approved.
            </DialogDescription>
          </DialogHeader>

          {cancelError && (
            <div className="p-3 text-xs rounded bg-destructive/10 text-destructive border border-destructive/20 mb-3">
              {cancelError}
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-md">
            Cancellation is permitted only while the request is in <strong>PENDING</strong> status.
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelModalOpen(false)}
              disabled={isCancelling}
              className="min-h-[44px]"
            >
              Keep Request
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
              className="min-h-[44px]"
            >
              {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
