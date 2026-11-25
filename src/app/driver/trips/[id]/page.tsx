'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Car,
  User,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  Navigation,
  ShieldAlert,
  Loader2,
  Check,
  CheckCheck,
  WifiOff,
} from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { tripService } from '@/services/trip-service';
import { offlineSyncService } from '@/services/offline-sync-service';
import { useOfflineSync } from '@/features/driver/hooks/use-offline-sync';
import { DriverActionType } from '@/features/driver/types/offline-types';
import { selectDriverTripDetail } from '@/features/driver/selectors/driver-selectors';
import { DriverMilestoneStepper } from '@/features/driver/components/driver-milestone-stepper';
import { DriverConfirmationDialog } from '@/features/driver/components/driver-confirmation-dialog';
import { ActivityTimeline } from '@/features/vehicle-requests/components/activity-timeline';
import { selectActivityTimeline } from '@/features/vehicle-requests/selectors/activity-selectors';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDisplayDateTime } from '@/lib/utils/date';
import { TRIP_LIFECYCLE_MILESTONES } from '@/features/vehicle-requests/types/view-models';

export default function DriverTripDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const legId = params?.id;

  const isHydrated = useFleetFlowStore((s) => s.isHydrated);
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const users = useFleetFlowStore((s) => s.users);
  const drivers = useFleetFlowStore((s) => s.drivers);
  const vehicles = useFleetFlowStore((s) => s.vehicles);
  const requests = useFleetFlowStore((s) => s.requests);
  const tripLegs = useFleetFlowStore((s) => s.tripLegs);
  const assignments = useFleetFlowStore((s) => s.assignments);
  const passengers = useFleetFlowStore((s) => s.passengers);
  const activityLogs = useFleetFlowStore((s) => s.activityLogs);
  const pendingActions = useFleetFlowStore((s) => s.pendingActions);

  const { isOnline } = useOfflineSync();

  const [isDialogOpen, setIsDialogOpen] = React.useState<boolean>(false);
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const activePendingAction = React.useMemo(() => {
    if (!legId || !currentUserId) return undefined;
    return pendingActions.find(
      (a) =>
        a.tripLegId === legId &&
        a.actorUserId === currentUserId &&
        (a.status === 'PENDING' || a.status === 'SYNCING')
    );
  }, [pendingActions, legId, currentUserId]);

  const selectorState = React.useMemo(
    () => ({
      users,
      drivers,
      vehicles,
      requests,
      tripLegs,
      assignments,
      passengers,
      activityLogs,
    }),
    [users, drivers, vehicles, requests, tripLegs, assignments, passengers, activityLogs]
  );

  const trip = React.useMemo(() => {
    if (!currentUserId || !legId) return null;
    return selectDriverTripDetail(selectorState, legId, currentUserId);
  }, [selectorState, legId, currentUserId]);

  const timelineItems = React.useMemo(() => {
    if (!trip) return [];
    return selectActivityTimeline(
      { activityLogs, users, tripLegs },
      trip.requestId
    );
  }, [activityLogs, users, tripLegs, trip]);

  // Handle Action Trigger
  const handleActionClick = () => {
    if (!trip?.nextAction || isProcessing || activePendingAction) return;
    setFeedback(null);
    setIsDialogOpen(true);
  };

  // Execute Service Action
  const handleConfirmAction = async () => {
    if (!trip || !trip.nextAction || !currentUserId || isProcessing) return;

    setIsProcessing(true);
    setFeedback(null);

    try {
      const { currentStatus, nextStatus } = trip.nextAction;

      // When working offline, enqueue action for automatic reconciliation upon reconnection
      if (!isOnline) {
        let actionType: DriverActionType;
        switch (currentStatus) {
          case 'ASSIGNED':
            actionType = 'ACCEPT_TRIP';
            break;
          case 'ACCEPTED':
            actionType = 'MARK_ARRIVED';
            break;
          case 'ARRIVED_AT_PICKUP':
            actionType = 'CONFIRM_PICKUP';
            break;
          case 'PICKED_UP':
            actionType = 'START_TRIP';
            break;
          case 'IN_PROGRESS':
            actionType = 'CONFIRM_DROPOFF';
            break;
          case 'DROPPED_OFF':
            actionType = 'COMPLETE_TRIP';
            break;
          default:
            throw new Error(`Unsupported trip status transition from ${currentStatus}`);
        }

        offlineSyncService.enqueueAction({
          tripLegId: trip.legId,
          actorUserId: currentUserId,
          actionType,
          currentStatus,
          targetStatus: nextStatus,
        });

        setFeedback({
          type: 'success',
          message: `Action recorded offline. Milestone (${nextStatus}) is queued locally and will synchronize automatically when connection is restored.`,
        });
        setIsDialogOpen(false);
        return;
      }

      // Online: Direct execution through TripService
      switch (currentStatus) {
        case 'ASSIGNED':
          await tripService.acceptTrip(trip.legId, currentUserId);
          setFeedback({ type: 'success', message: 'Trip assignment accepted successfully.' });
          break;
        case 'ACCEPTED':
          await tripService.markArrivedAtPickup(trip.legId, currentUserId);
          setFeedback({ type: 'success', message: 'Arrival at pickup location recorded.' });
          break;
        case 'ARRIVED_AT_PICKUP':
          await tripService.confirmPickup(trip.legId, currentUserId);
          setFeedback({ type: 'success', message: 'Passenger boarding confirmed.' });
          break;
        case 'PICKED_UP':
          await tripService.startTrip(trip.legId, currentUserId);
          setFeedback({ type: 'success', message: 'Journey started; vehicle now in transit.' });
          break;
        case 'IN_PROGRESS':
          await tripService.confirmDropoff(trip.legId, currentUserId);
          setFeedback({ type: 'success', message: 'Passenger drop-off at destination confirmed.' });
          break;
        case 'DROPPED_OFF':
          await tripService.completeTrip(trip.legId, currentUserId);
          setFeedback({ type: 'success', message: 'Trip finalized and closed. Resources released.' });
          break;
        default:
          throw new Error(`Unsupported trip status transition from ${currentStatus}`);
      }

      setIsDialogOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to advance trip status.';
      setFeedback({ type: 'error', message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="container max-w-full md:max-w-4xl lg:max-w-6xl mx-auto py-8 px-4 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground font-medium">Loading trip execution console...</span>
        </div>
      </div>
    );
  }

  // Unauthorized or Missing Trip Guard
  if (!trip) {
    return (
      <div className="container max-w-full md:max-w-xl mx-auto py-12 px-4">
        <Card className="border-border shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-2">
              <ShieldAlert className="h-6 w-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              Trip Leg Not Found or Restricted
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Trip leg <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{legId}</code> does not exist or is not assigned to your active driver profile.
            </p>
            <div className="pt-2">
              <Link href="/driver/dashboard" className={cn(buttonVariants(), 'w-full')}>
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                <span>Return to Driver Dashboard</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const milestone = TRIP_LIFECYCLE_MILESTONES[trip.status];

  return (
    <div className="container max-w-full md:max-w-4xl lg:max-w-6xl mx-auto py-4 sm:py-6 md:py-8 px-4 sm:px-6 md:px-6 lg:px-8 space-y-6">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/driver/trips"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 px-2 text-muted-foreground -ml-2')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
              <span>My Trips</span>
            </Link>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="font-mono text-xs font-semibold text-muted-foreground">{trip.requestId}</span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${
                trip.legType === 'OUTBOUND'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}
            >
              {trip.legType === 'OUTBOUND' ? 'Outbound Leg' : 'Return Leg'}
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Trip Execution Console</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {!isOnline && (
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 font-semibold bg-amber-50 text-amber-800 border-amber-300 gap-1"
            >
              <WifiOff className="h-3 w-3" />
              <span>Offline (Cached)</span>
            </Badge>
          )}
          <Badge className="text-xs px-2.5 py-1 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
            {milestone?.label || trip.status}
          </Badge>
        </div>
      </div>

      {/* Visual Milestone Stepper */}
      <Card className="border-border shadow-xs p-3 sm:p-4 bg-card">
        <DriverMilestoneStepper currentStatus={trip.status} />
      </Card>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-lg border flex items-center gap-2.5 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-destructive/10 text-destructive border-destructive/20'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grid: Details & Execution Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Route Manifest, Passengers, Vehicle */}
        <div className="lg:col-span-2 space-y-6">
          {/* Journey Manifest */}
          <Card className="border-border shadow-xs">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Journey Route & Timing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-3 w-3 rounded-full bg-primary mt-1 shrink-0 ring-4 ring-primary/20" />
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Pickup Address
                    </span>
                    <span className="text-base font-bold text-foreground">{trip.pickupLocation}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Destination Address
                    </span>
                    <span className="text-base font-bold text-foreground">{trip.destination}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/60 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                    Scheduled Departure
                  </span>
                  <span className="font-medium text-foreground">{formatDisplayDateTime(trip.scheduledDeparture)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                    Estimated Arrival
                  </span>
                  <span className="font-medium text-foreground">{formatDisplayDateTime(trip.scheduledArrival)}</span>
                </div>
              </div>

              {trip.purpose && (
                <div className="pt-3 border-t border-border/60 text-xs">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                    Mission Purpose
                  </span>
                  <p className="text-foreground mt-0.5">{trip.purpose}</p>
                </div>
              )}

              {trip.notes && (
                <div className="pt-2 text-xs bg-muted/40 p-2.5 rounded border border-border/50">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                    Special Instructions / Notes
                  </span>
                  <p className="text-foreground mt-0.5 italic">{trip.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Passenger Information */}
          <Card className="border-border shadow-xs">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>Passenger Manifest</span>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  {trip.passengerCount} {trip.passengerCount === 1 ? 'Person' : 'Passengers'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border/50 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground block">{trip.requesterName} (Lead)</span>
                    <span className="text-[11px] text-muted-foreground block">{trip.requesterDepartment}</span>
                  </div>
                </div>

                {trip.requesterPhone && (
                  <a
                    href={`tel:${trip.requesterPhone}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-8 text-xs gap-1.5 font-medium')}
                  >
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>{trip.requesterPhone}</span>
                  </a>
                )}
              </div>

              {trip.passengers.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Accompanying Colleagues ({trip.passengers.length})
                  </span>
                  <div className="divide-y divide-border/60 border border-border/60 rounded-md overflow-hidden">
                    {trip.passengers.map((p) => (
                      <div key={p.id} className="p-2.5 text-xs flex items-center justify-between bg-card">
                        <span className="font-medium text-foreground">{p.name}</span>
                        <span className="text-muted-foreground">{p.department || 'Staff'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Allocation */}
          <Card className="border-border shadow-xs">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Assigned Fleet Vehicle</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <span className="text-base font-bold text-foreground block">{trip.vehicleModel}</span>
                  <span className="text-xs text-muted-foreground">Fleet ID: {trip.vehicleId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Capacity: {trip.vehicleCapacity} Seats</span>
                  <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5 bg-muted">
                    {trip.vehiclePlate}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Execution Action Console & Activity Log */}
        <div className="space-y-6">
          {/* Action Console (Desktop View) */}
          <Card className="border-2 border-primary/30 shadow-md bg-card hidden md:block">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Next Milestone Action</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-1 space-y-4">
              {trip.isCompleted ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-lg text-center space-y-2">
                  <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                    <CheckCheck className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-sm">Journey Fully Concluded</h3>
                  <p className="text-xs text-emerald-800">
                    This trip leg has been finalized and closed. Resources have been returned to available fleet inventory.
                  </p>
                </div>
              ) : trip.nextAction ? (
                <div className="space-y-3">
                  {activePendingAction && (
                    <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
                        <span>Action Queued Offline (Awaiting Sync)</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        Milestone transition to <strong>{activePendingAction.targetStatus}</strong> has been saved locally. It will automatically synchronize with corporate dispatch once network connectivity is restored.
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {trip.nextAction.dialogDescription}
                  </p>
                  <Button
                    onClick={handleActionClick}
                    disabled={isProcessing || !!activePendingAction}
                    size="lg"
                    className="w-full h-14 text-base font-bold shadow-md gap-2"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Check className="h-5 w-5" />
                    )}
                    <span>
                      {activePendingAction ? 'Action Queued (Awaiting Sync)' : trip.nextAction.buttonLabel}
                    </span>
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground text-center py-2">
                  No active actions available.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Audit History */}
          <Card className="border-border shadow-xs">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold text-foreground">
                Activity & Audit History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <ActivityTimeline items={timelineItems} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Mobile Floating Execution Bar (< md) */}
      {!trip.isCompleted && trip.nextAction && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border shadow-2xl p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Button
            onClick={handleActionClick}
            disabled={isProcessing || !!activePendingAction}
            size="lg"
            className="w-full h-14 text-base font-bold shadow-lg gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            <span>
              {activePendingAction ? 'Action Queued (Awaiting Sync)' : trip.nextAction.buttonLabel}
            </span>
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <DriverConfirmationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleConfirmAction}
        actionDescriptor={trip.nextAction}
        isLoading={isProcessing}
      />
    </div>
  );
}
