'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserCheck,
  Car,
  Users,
  Navigation,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Search,
  Filter,
} from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { assignmentService, TimeWindow, ConflictCheckResult } from '@/services/assignment-service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatDisplayDateTime } from '@/lib/utils/date';
import { TripLeg, VehicleRequest } from '@/types/domain';

export default function AdminAssignmentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedRequestId = searchParams.get('requestId');

  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const requests = useFleetFlowStore((s) => s.requests);
  const tripLegs = useFleetFlowStore((s) => s.tripLegs);
  const vehicles = useFleetFlowStore((s) => s.vehicles);
  const drivers = useFleetFlowStore((s) => s.drivers);
  const users = useFleetFlowStore((s) => s.users);
  const assignments = useFleetFlowStore((s) => s.assignments);

  const userMap = React.useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const vehicleMap = React.useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const driverMap = React.useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);

  // Approved requests awaiting assignment (either APPROVED or ASSIGNED with unassigned legs)
  const assignableRequests = React.useMemo(() => {
    return requests.filter((r) => {
      if (r.status !== 'APPROVED' && r.status !== 'ASSIGNED') return false;
      const legs = tripLegs.filter((l) => l.requestId === r.id);
      return legs.some((l) => l.status === 'PENDING_ASSIGNMENT');
    });
  }, [requests, tripLegs]);

  // Active leg modal state
  const [selectedLeg, setSelectedLeg] = React.useState<TripLeg | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = React.useState<string>('');
  const [conflictResult, setConflictResult] = React.useState<ConflictCheckResult>({ hasConflict: false });
  const [isCheckingConflict, setIsCheckingConflict] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pre-select request leg if query param provided
  React.useEffect(() => {
    if (preselectedRequestId && !selectedLeg) {
      const matchLeg = tripLegs.find(
        (l) => l.requestId === preselectedRequestId && l.status === 'PENDING_ASSIGNMENT'
      );
      if (matchLeg) {
        openDispatchModal(matchLeg);
      }
    }
  }, [preselectedRequestId, tripLegs, selectedLeg]);

  // Check conflicts whenever vehicle or driver changes
  React.useEffect(() => {
    if (!selectedLeg || (!selectedVehicleId && !selectedDriverId)) {
      setConflictResult({ hasConflict: false });
      return;
    }

    let active = true;
    const runCheck = async () => {
      setIsCheckingConflict(true);
      const window: TimeWindow = {
        start: selectedLeg.scheduledDeparture,
        end: selectedLeg.scheduledArrival,
      };
      try {
        const res = await assignmentService.checkAssignmentConflict(
          window,
          selectedVehicleId || undefined,
          selectedDriverId || undefined
        );
        if (active) {
          setConflictResult(res);
        }
      } catch (e) {
        console.error('Error running conflict check:', e);
      } finally {
        if (active) setIsCheckingConflict(false);
      }
    };

    runCheck();
    return () => {
      active = false;
    };
  }, [selectedLeg, selectedVehicleId, selectedDriverId]);

  const openDispatchModal = (leg: TripLeg) => {
    setSelectedLeg(leg);
    setSelectedVehicleId('');
    setSelectedDriverId('');
    setConflictResult({ hasConflict: false });
    setFormError(null);
  };

  const closeDispatchModal = () => {
    setSelectedLeg(null);
    setSelectedVehicleId('');
    setSelectedDriverId('');
    setConflictResult({ hasConflict: false });
    setFormError(null);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedLeg) return;
    if (!selectedVehicleId) {
      setFormError('Please select a vehicle to assign.');
      return;
    }
    if (!selectedDriverId) {
      setFormError('Please select a driver to assign.');
      return;
    }
    if (conflictResult.hasConflict) {
      setFormError(`Cannot assign: ${conflictResult.reason}`);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const asg = await assignmentService.createAssignment(
        selectedLeg.id,
        selectedVehicleId,
        selectedDriverId,
        currentUserId
      );

      setFeedback({
        type: 'success',
        message: `Trip leg ${selectedLeg.id} assigned successfully to vehicle (${vehicleMap.get(selectedVehicleId)?.registrationNumber}) and driver.`,
      });
      closeDispatchModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create assignment.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recent assignment history (newest first)
  const recentAssignments = React.useMemo(() => {
    return [...assignments].sort(
      (a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );
  }, [assignments]);

  const parentRequestForSelectedLeg = selectedLeg
    ? requests.find((r) => r.id === selectedLeg.requestId)
    : undefined;

  return (
    <div className="container max-w-full md:max-w-6xl lg:max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 md:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <UserCheck className="h-6 w-6 text-primary" aria-hidden="true" />
            <span>Vehicle & Driver Dispatch Center</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Allocate corporate fleet vehicles and professional drivers to approved transportation requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/trips"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border border-border bg-card text-foreground hover:bg-muted shadow-xs transition-colors"
          >
            <Navigation className="h-3.5 w-3.5 text-primary" />
            <span>View Trip Monitor</span>
          </Link>
        </div>
      </div>

      {/* Global Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Grid: Approved Requests Awaiting Dispatch (Left/Top) vs. Recent History (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Awaiting Dispatch Queue */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Approved Requests Awaiting Dispatch</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Select a trip leg below to allocate an available vehicle and driver
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {assignableRequests.length} Request{assignableRequests.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-1">
              {assignableRequests.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-foreground text-sm">All Approved Requests Dispatched</p>
                  <p>There are currently no approved requests awaiting vehicle or driver assignment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignableRequests.map((req) => {
                    const requester = userMap.get(req.requesterId);
                    const legs = tripLegs.filter((l) => l.requestId === req.id);

                    return (
                      <div
                        key={req.id}
                        className="rounded-lg border border-border p-4 bg-muted/20 space-y-3"
                      >
                        {/* Request Header */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">
                              {req.id}
                            </span>
                            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                              {req.tripType === 'ROUND_TRIP' ? 'Round-Trip' : 'One-Way'}
                            </Badge>
                            <span className="text-xs font-medium text-foreground">
                              {requester?.name || 'Employee'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({req.passengerCount} passenger{req.passengerCount !== 1 ? 's' : ''})
                            </span>
                          </div>
                          <Link
                            href={`/admin/requests/${req.id}`}
                            className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                          >
                            <span>Details</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>

                        {/* Trip Legs List for this request */}
                        <div className="space-y-2 pt-1">
                          {legs.map((leg) => {
                            const isAssigned = leg.status !== 'PENDING_ASSIGNMENT';
                            const legAsg = assignments.find(
                              (a) => a.tripLegId === leg.id && a.status === 'ACTIVE'
                            );
                            const assignedVeh = legAsg ? vehicleMap.get(legAsg.vehicleId) : undefined;
                            const assignedDrv = legAsg ? driverMap.get(legAsg.driverId) : undefined;
                            const drvUser = assignedDrv ? userMap.get(assignedDrv.userId) : undefined;

                            return (
                              <div
                                key={leg.id}
                                className={`p-3 rounded-md border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  isAssigned
                                    ? 'bg-muted/40 border-border/60 text-muted-foreground'
                                    : 'bg-card border-border hover:border-primary/50 shadow-xs'
                                }`}
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={leg.legType === 'OUTBOUND' ? 'default' : 'secondary'}
                                      className="text-[9px] px-1.5 py-0 uppercase"
                                    >
                                      {leg.legType} Leg
                                    </Badge>
                                    <span className="font-mono text-[11px] text-muted-foreground">
                                      {leg.id}
                                    </span>
                                    {isAssigned ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>Assigned ({assignedVeh?.registrationNumber})</span>
                                      </span>
                                    ) : (
                                      <Badge variant="pending" className="text-[10px] py-0">
                                        Unassigned
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="font-medium text-foreground truncate">
                                    {leg.pickupLocation} → {leg.destination}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground font-mono">
                                    Departure: {formatDisplayDateTime(leg.scheduledDeparture)}
                                  </p>
                                </div>

                                <div className="sm:flex-shrink-0">
                                  {isAssigned ? (
                                    <div className="text-right text-[11px]">
                                      <span className="text-foreground font-medium block">
                                        {assignedVeh?.model}
                                      </span>
                                      <span className="text-muted-foreground block">
                                        Driver: {drvUser?.name || 'Assigned'}
                                      </span>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => openDispatchModal(leg)}
                                      className="h-8 text-xs px-3.5 w-full sm:w-auto flex items-center gap-1.5"
                                    >
                                      <UserCheck className="h-3.5 w-3.5" />
                                      <span>Dispatch Resources</span>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): Assignment Audit History */}
        <div className="space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Recent Dispatch History</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Log of vehicle and driver allocations
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-1">
              {recentAssignments.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No assignments recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentAssignments.slice(0, 8).map((asg) => {
                    const veh = vehicleMap.get(asg.vehicleId);
                    const drv = driverMap.get(asg.driverId);
                    const drvUser = drv ? userMap.get(drv.userId) : undefined;
                    const leg = tripLegs.find((l) => l.id === asg.tripLegId);

                    return (
                      <div key={asg.id} className="py-2.5 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-primary">
                            {asg.id}
                          </span>
                          <Badge
                            variant={asg.status === 'ACTIVE' ? 'assigned' : 'outline'}
                            className="text-[9px] py-0"
                          >
                            {asg.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-foreground">
                          <span>{veh?.model || asg.vehicleId} ({veh?.registrationNumber})</span>
                          <span className="text-muted-foreground font-mono">
                            {drvUser?.name || asg.driverId}
                          </span>
                        </div>
                        {leg && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            Leg: {leg.id} ({leg.pickupLocation.split('—')[0]} → {leg.destination.split('—')[0]})
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dispatch Modal Dialog */}
      <Dialog open={Boolean(selectedLeg)} onOpenChange={(open) => !open && closeDispatchModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <UserCheck className="h-5 w-5 text-primary" />
              <span>Dispatch Resources to Trip Leg</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Allocate a qualified vehicle and available driver. Conflict checking enforces no schedule overlap.
            </DialogDescription>
          </DialogHeader>

          {selectedLeg && (
            <div className="space-y-4 py-2 text-xs">
              {/* Target Leg Summary */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary">{selectedLeg.id}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {selectedLeg.legType} Leg
                  </Badge>
                </div>
                <p className="font-medium text-foreground">
                  {selectedLeg.pickupLocation} → {selectedLeg.destination}
                </p>
                <div className="flex items-center justify-between text-muted-foreground font-mono text-[11px] pt-1">
                  <span>Dep: {formatDisplayDateTime(selectedLeg.scheduledDeparture)}</span>
                  <span>Pax Req: {parentRequestForSelectedLeg?.passengerCount || 1}</span>
                </div>
              </div>

              {/* Form Controls */}
              <div className="space-y-3">
                {/* Vehicle Selection */}
                <div className="space-y-1">
                  <label htmlFor="vehicle-select" className="font-semibold text-foreground flex items-center justify-between">
                    <span>Select Vehicle <span className="text-red-600">*</span></span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      Min capacity: {parentRequestForSelectedLeg?.passengerCount || 1} pax
                    </span>
                  </label>
                  <select
                    id="vehicle-select"
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- Choose a fleet vehicle --</option>
                    {vehicles.map((v) => {
                      const meetsCapacity =
                        !parentRequestForSelectedLeg ||
                        v.capacity >= parentRequestForSelectedLeg.passengerCount;
                      return (
                        <option
                          key={v.id}
                          value={v.id}
                          disabled={!meetsCapacity}
                        >
                          {v.model} ({v.registrationNumber}) • {v.capacity} Seats {meetsCapacity ? '' : '— INSUFFICIENT SEATS'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Driver Selection */}
                <div className="space-y-1">
                  <label htmlFor="driver-select" className="font-semibold text-foreground block">
                    Select Driver <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="driver-select"
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- Choose an active driver --</option>
                    {drivers.map((d) => {
                      const driverUser = userMap.get(d.userId);
                      return (
                        <option
                          key={d.id}
                          value={d.id}
                          disabled={d.status === 'OFF_DUTY'}
                        >
                          {driverUser?.name || d.id} • {d.phone} ({d.status})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Conflict / Availability Warning Banner */}
              {conflictResult.hasConflict && (
                <div className="p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span>Schedule Conflict Warning</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-700">
                    {conflictResult.reason}
                  </p>
                </div>
              )}

              {/* Form Error Banner */}
              {formError && (
                <div className="p-2.5 rounded-md border border-red-200 bg-red-50 text-red-800 text-xs font-medium">
                  {formError}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={closeDispatchModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirmAssignment}
              disabled={isSubmitting || conflictResult.hasConflict || !selectedVehicleId || !selectedDriverId}
              className="bg-primary text-primary-foreground"
            >
              Confirm & Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
