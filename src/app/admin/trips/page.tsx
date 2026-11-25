'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Navigation,
  Car,
  User,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Check,
} from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { tripService } from '@/services/trip-service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatDisplayDateTime } from '@/lib/utils/date';
import {
  TRIP_LIFECYCLE_MILESTONES,
  TRIP_LIFECYCLE_STEPS,
} from '@/features/vehicle-requests/types/view-models';
import { TripLeg, TripLegStatus } from '@/types/domain';
import { EmptyState } from '@/components/shared/empty-state';

export default function AdminTripMonitoringPage() {
  const tripLegs = useFleetFlowStore((s) => s.tripLegs);
  const requests = useFleetFlowStore((s) => s.requests);
  const assignments = useFleetFlowStore((s) => s.assignments);
  const vehicles = useFleetFlowStore((s) => s.vehicles);
  const drivers = useFleetFlowStore((s) => s.drivers);
  const users = useFleetFlowStore((s) => s.users);
  const activityLogs = useFleetFlowStore((s) => s.activityLogs);
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);

  const reqMap = React.useMemo(() => new Map(requests.map((r) => [r.id, r])), [requests]);
  const userMap = React.useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const vehicleMap = React.useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const driverMap = React.useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);
  const assignmentMap = React.useMemo(() => {
    const map = new Map<string, (typeof assignments)[0]>();
    assignments.forEach((a) => {
      if (a.status === 'ACTIVE' || a.status === 'COMPLETED') {
        map.set(a.tripLegId, a);
      }
    });
    return map;
  }, [assignments]);

  // Operational status breakdown counts
  const assignedCount = tripLegs.filter((l) => l.status === 'ASSIGNED').length;
  const acceptedCount = tripLegs.filter((l) => l.status === 'ACCEPTED').length;
  const inProgressCount = tripLegs.filter(
    (l) => l.status === 'ARRIVED_AT_PICKUP' || l.status === 'PICKED_UP' || l.status === 'IN_PROGRESS' || l.status === 'DROPPED_OFF'
  ).length;
  const completedCount = tripLegs.filter((l) => l.status === 'COMPLETED').length;

  // Filter state
  const [statusCategory, setStatusCategory] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Selected trip detail modal
  const [selectedLegId, setSelectedLegId] = React.useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  const selectedLeg = selectedLegId
    ? tripLegs.find((l) => l.id === selectedLegId)
    : null;

  // Filtered trip legs (only assigned or active or completed)
  const filteredLegs = React.useMemo(() => {
    return tripLegs.filter((leg) => {
      // Exclude legs that haven't been assigned at all
      if (leg.status === 'PENDING_ASSIGNMENT') return false;

      // Status filter
      if (statusCategory === 'ASSIGNED' && leg.status !== 'ASSIGNED') return false;
      if (statusCategory === 'ACCEPTED' && leg.status !== 'ACCEPTED') return false;
      if (
        statusCategory === 'IN_PROGRESS' &&
        !['ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_PROGRESS', 'DROPPED_OFF'].includes(leg.status)
      ) {
        return false;
      }
      if (statusCategory === 'COMPLETED' && leg.status !== 'COMPLETED') return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      if (leg.id.toLowerCase().includes(q) || leg.requestId.toLowerCase().includes(q)) {
        return true;
      }
      if (
        leg.pickupLocation.toLowerCase().includes(q) ||
        leg.destination.toLowerCase().includes(q)
      ) {
        return true;
      }

      const asg = assignmentMap.get(leg.id);
      if (asg) {
        const veh = vehicleMap.get(asg.vehicleId);
        if (
          veh &&
          (veh.model.toLowerCase().includes(q) ||
            veh.registrationNumber.toLowerCase().includes(q))
        ) {
          return true;
        }
        const drv = driverMap.get(asg.driverId);
        if (drv) {
          const drvUser = userMap.get(drv.userId);
          if (drvUser && drvUser.name.toLowerCase().includes(q)) return true;
        }
      }

      const req = reqMap.get(leg.requestId);
      if (req) {
        const requester = userMap.get(req.requesterId);
        if (requester && requester.name.toLowerCase().includes(q)) return true;
      }

      return false;
    });
  }, [tripLegs, statusCategory, searchQuery, reqMap, userMap, vehicleMap, driverMap, assignmentMap]);

  // Handle advancing driver status via tripService
  const handleAdvanceStatus = async (leg: TripLeg, nextAction: string) => {
    // Resolve actor exclusively from authenticated session; never substitute a hardcoded ID
    if (!currentUserId) {
      setActionFeedback('Error: Authenticated admin session required to advance trip status.');
      return;
    }

    const actorUserId = currentUserId;

    setIsUpdatingStatus(true);
    setActionFeedback(null);

    try {
      if (nextAction === 'ACCEPT') {
        await tripService.acceptTrip(leg.id, actorUserId);
        setActionFeedback('Trip marked ACCEPTED by driver.');
      } else if (nextAction === 'ARRIVE_PICKUP') {
        await tripService.markArrivedAtPickup(leg.id, actorUserId);
        setActionFeedback('Driver reported ARRIVED AT PICKUP.');
      } else if (nextAction === 'CONFIRM_PICKUP') {
        await tripService.confirmPickup(leg.id, actorUserId);
        setActionFeedback('Passengers confirmed boarded (PICKED UP).');
      } else if (nextAction === 'START_TRIP') {
        await tripService.startTrip(leg.id, actorUserId);
        setActionFeedback('Trip started; vehicle in transit (IN PROGRESS).');
      } else if (nextAction === 'CONFIRM_DROPOFF') {
        await tripService.confirmDropoff(leg.id, actorUserId);
        setActionFeedback('Driver confirmed arrival at destination (DROPPED OFF).');
      } else if (nextAction === 'COMPLETE') {
        await tripService.completeTrip(leg.id, actorUserId);
        setActionFeedback('Trip finalized and marked COMPLETED.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update trip status.';
      setActionFeedback(`Error: ${msg}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: TripLegStatus) => {
    const milestone = TRIP_LIFECYCLE_MILESTONES[status];
    if (status === 'ASSIGNED') {
      return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">{milestone?.shortLabel || status}</Badge>;
    }
    if (status === 'ACCEPTED') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">{milestone?.shortLabel || status}</Badge>;
    }
    if (['ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_PROGRESS', 'DROPPED_OFF'].includes(status)) {
      return <Badge className="bg-violet-100 text-violet-800 border-violet-200">{milestone?.shortLabel || status}</Badge>;
    }
    if (status === 'COMPLETED') {
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Completed</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="container max-w-full md:max-w-6xl lg:max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 md:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Navigation className="h-6 w-6 text-primary" aria-hidden="true" />
            <span>Trip Monitoring Center</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time administrative visibility into driver journey progress, passenger confirmations, and vehicle availability.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-md border border-border">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <span>Explicit Driver-Reported Milestones • No Fake GPS</span>
        </div>
      </div>

      {/* Summary Counts (4 Categories) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => setStatusCategory(statusCategory === 'ASSIGNED' ? 'ALL' : 'ASSIGNED')}
          className={`p-4 rounded-lg border text-left transition-all ${
            statusCategory === 'ASSIGNED'
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
              : 'bg-card border-border hover:bg-muted/30 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Assigned
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-indigo-900 block mt-1">
            {assignedCount}
          </span>
          <span className="text-[11px] text-muted-foreground">Awaiting driver accept</span>
        </button>

        <button
          onClick={() => setStatusCategory(statusCategory === 'ACCEPTED' ? 'ALL' : 'ACCEPTED')}
          className={`p-4 rounded-lg border text-left transition-all ${
            statusCategory === 'ACCEPTED'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20'
              : 'bg-card border-border hover:bg-muted/30 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Accepted
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-blue-900 block mt-1">
            {acceptedCount}
          </span>
          <span className="text-[11px] text-muted-foreground">Preparing for departure</span>
        </button>

        <button
          onClick={() => setStatusCategory(statusCategory === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
          className={`p-4 rounded-lg border text-left transition-all ${
            statusCategory === 'IN_PROGRESS'
              ? 'bg-violet-50 border-violet-300 ring-2 ring-violet-500/20'
              : 'bg-card border-border hover:bg-muted/30 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            In Progress
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-violet-900 block mt-1">
            {inProgressCount}
          </span>
          <span className="text-[11px] text-muted-foreground">En route / Boarded / Staging</span>
        </button>

        <button
          onClick={() => setStatusCategory(statusCategory === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
          className={`p-4 rounded-lg border text-left transition-all ${
            statusCategory === 'COMPLETED'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-card border-border hover:bg-muted/30 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Completed
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-emerald-900 block mt-1">
            {completedCount}
          </span>
          <span className="text-[11px] text-muted-foreground">Finalized journeys</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-4 rounded-lg border border-border shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Trip ID, Request ID, route, vehicle, driver..."
            className="pl-9 h-9 text-xs"
            aria-label="Search active trips"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Filter:</span>
          <select
            value={statusCategory}
            onChange={(e) => setStatusCategory(e.target.value)}
            className="h-9 px-2.5 rounded-md border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Active & Completed Trips</option>
            <option value="ASSIGNED">Assigned ({assignedCount})</option>
            <option value="ACCEPTED">Accepted ({acceptedCount})</option>
            <option value="IN_PROGRESS">In Progress ({inProgressCount})</option>
            <option value="COMPLETED">Completed ({completedCount})</option>
          </select>

          {(statusCategory !== 'ALL' || searchQuery.trim()) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusCategory('ALL');
                setSearchQuery('');
              }}
              className="text-xs h-9 text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Trips Table */}
      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        {filteredLegs.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Navigation}
              title="No trips found"
              description="No trips match the current filter or search criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[120px]">Trip ID</TableHead>
                  <TableHead className="w-[100px]">Request</TableHead>
                  <TableHead className="w-[160px]">Employee</TableHead>
                  <TableHead>Route (Pickup → Destination)</TableHead>
                  <TableHead className="w-[180px]">Vehicle & Driver</TableHead>
                  <TableHead className="w-[130px]">Scheduled Time</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[90px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLegs.map((leg) => {
                  const req = reqMap.get(leg.requestId);
                  const requester = req ? userMap.get(req.requesterId) : undefined;
                  const asg = assignmentMap.get(leg.id);
                  const veh = asg ? vehicleMap.get(asg.vehicleId) : undefined;
                  const drv = asg ? driverMap.get(asg.driverId) : undefined;
                  const drvUser = drv ? userMap.get(drv.userId) : undefined;

                  return (
                    <TableRow
                      key={leg.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => {
                        setSelectedLegId(leg.id);
                        setActionFeedback(null);
                      }}
                    >
                      {/* Trip ID */}
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {leg.id}
                      </TableCell>

                      {/* Request ID */}
                      <TableCell>
                        <Link
                          href={`/admin/requests/${leg.requestId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs text-muted-foreground hover:text-primary hover:underline"
                        >
                          {leg.requestId}
                        </Link>
                      </TableCell>

                      {/* Employee */}
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold text-foreground line-clamp-1">
                            {requester?.name || 'Employee'}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {req?.passengerCount || 1} pax
                          </span>
                        </div>
                      </TableCell>

                      {/* Route */}
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="font-medium text-foreground line-clamp-1">
                            {leg.pickupLocation}
                          </span>
                          <span className="text-muted-foreground line-clamp-1 flex items-center gap-1 text-[11px]">
                            <span className="text-slate-400">→</span> {leg.destination}
                          </span>
                        </div>
                      </TableCell>

                      {/* Vehicle & Driver */}
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="font-medium text-foreground line-clamp-1">
                            {veh ? `${veh.model} (${veh.registrationNumber})` : 'Unassigned'}
                          </span>
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            Driver: {drvUser?.name || 'Assigned Driver'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Scheduled Time */}
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {formatDisplayDateTime(leg.scheduledDeparture)}
                      </TableCell>

                      {/* Status */}
                      <TableCell>{getStatusBadge(leg.status)}</TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLegId(leg.id);
                            setActionFeedback(null);
                          }}
                          className="h-7 text-xs px-2.5"
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Trip Details & Milestone Progression Modal */}
      <Dialog open={Boolean(selectedLeg)} onOpenChange={(open) => !open && setSelectedLegId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedLeg && (() => {
            const req = reqMap.get(selectedLeg.requestId);
            const requester = req ? userMap.get(req.requesterId) : undefined;
            const asg = assignmentMap.get(selectedLeg.id);
            const veh = asg ? vehicleMap.get(asg.vehicleId) : undefined;
            const drv = asg ? driverMap.get(asg.driverId) : undefined;
            const drvUser = drv ? userMap.get(drv.userId) : undefined;
            const currentMilestone = TRIP_LIFECYCLE_MILESTONES[selectedLeg.status];

            // Associated audit events
            const legLogs = activityLogs
              .filter((log) => log.tripLegId === selectedLeg.id || (log.requestId === selectedLeg.requestId && log.action.startsWith('TRIP_')))
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            return (
              <div className="space-y-5">
                <DialogHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <DialogTitle className="flex items-center gap-2 font-mono text-base font-bold text-primary">
                      <Navigation className="h-4 w-4" />
                      <span>{selectedLeg.id}</span>
                    </DialogTitle>
                    {getStatusBadge(selectedLeg.status)}
                  </div>
                  <DialogDescription className="text-xs pt-1">
                    Parent Request: <Link href={`/admin/requests/${selectedLeg.requestId}`} className="font-mono text-primary hover:underline">{selectedLeg.requestId}</Link> • Passenger: {requester?.name || 'Employee'} ({req?.passengerCount || 1} pax)
                  </DialogDescription>
                </DialogHeader>

                {/* Feedback Alert inside Modal */}
                {actionFeedback && (
                  <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium">
                    {actionFeedback}
                  </div>
                )}

                {/* 1. Milestone Lifecycle Stepper */}
                <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Journey Lifecycle Progress (Step {currentMilestone.step} of 8)
                    </span>
                    <span className="text-xs font-mono font-bold text-primary">
                      {currentMilestone.percentage}% Complete
                    </span>
                  </div>

                  {/* Visual Stepper Dots */}
                  <div className="grid grid-cols-8 gap-1 py-1">
                    {TRIP_LIFECYCLE_STEPS.map((step) => {
                      const isPast = step.step < currentMilestone.step;
                      const isCurrent = step.step === currentMilestone.step;
                      return (
                        <div key={step.status} className="flex flex-col items-center gap-1 text-center">
                          <div
                            className={`h-2.5 w-full rounded-full transition-all ${
                              isPast
                                ? 'bg-primary'
                                : isCurrent
                                ? 'bg-primary animate-pulse ring-2 ring-primary/30'
                                : 'bg-muted'
                            }`}
                          />
                          <span className={`text-[9px] truncate w-full hidden sm:block ${isCurrent ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                            {step.shortLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    <strong>Current Milestone:</strong> {currentMilestone.description}
                  </p>
                </div>

                {/* 2. Route & Assigned Resources */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                      Route & Schedule
                    </span>
                    <p className="font-medium text-foreground">
                      <strong>From:</strong> {selectedLeg.pickupLocation}
                    </p>
                    <p className="font-medium text-foreground">
                      <strong>To:</strong> {selectedLeg.destination}
                    </p>
                    <p className="text-muted-foreground font-mono text-[11px] pt-1">
                      Depart: {formatDisplayDateTime(selectedLeg.scheduledDeparture)}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                      Assigned Resources
                    </span>
                    <p className="font-medium text-foreground flex items-center gap-1.5">
                      <Car className="h-3.5 w-3.5 text-primary" />
                      <span>{veh ? `${veh.model} (${veh.registrationNumber})` : 'Unassigned'}</span>
                    </p>
                    <p className="font-medium text-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      <span>Driver: {drvUser?.name || 'Assigned Driver'}</span>
                    </p>
                    {drv && (
                      <p className="text-muted-foreground font-mono text-[11px] pl-5">
                        Phone: {drv.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Driver Status Simulation / Advancement Actions (Administrative Controls) */}
                <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Driver Milestone Confirmation & Progression</span>
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Record explicit driver-reported milestone progress. Updates synchronize across Employee and Driver portals.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedLeg.status === 'ASSIGNED' && (
                      <Button
                        size="sm"
                        onClick={() => handleAdvanceStatus(selectedLeg, 'ACCEPT')}
                        disabled={isUpdatingStatus}
                        className="text-xs h-8"
                      >
                        Confirm Driver Accepted
                      </Button>
                    )}
                    {selectedLeg.status === 'ACCEPTED' && (
                      <Button
                        size="sm"
                        onClick={() => handleAdvanceStatus(selectedLeg, 'ARRIVE_PICKUP')}
                        disabled={isUpdatingStatus}
                        className="text-xs h-8"
                      >
                        Confirm Arrived at Pickup
                      </Button>
                    )}
                    {selectedLeg.status === 'ARRIVED_AT_PICKUP' && (
                      <Button
                        size="sm"
                        onClick={() => handleAdvanceStatus(selectedLeg, 'CONFIRM_PICKUP')}
                        disabled={isUpdatingStatus}
                        className="text-xs h-8"
                      >
                        Confirm Passengers Boarded
                      </Button>
                    )}
                    {selectedLeg.status === 'PICKED_UP' && (
                      <Button
                        size="sm"
                        onClick={() => handleAdvanceStatus(selectedLeg, 'START_TRIP')}
                        disabled={isUpdatingStatus}
                        className="text-xs h-8"
                      >
                        Start Transit (In Progress)
                      </Button>
                    )}
                    {selectedLeg.status === 'IN_PROGRESS' && (
                      <Button
                        size="sm"
                        onClick={() => handleAdvanceStatus(selectedLeg, 'CONFIRM_DROPOFF')}
                        disabled={isUpdatingStatus}
                        className="text-xs h-8"
                      >
                        Confirm Arrival & Drop-Off
                      </Button>
                    )}
                    {selectedLeg.status === 'DROPPED_OFF' && (
                      <Button
                        size="sm"
                        onClick={() => handleAdvanceStatus(selectedLeg, 'COMPLETE')}
                        disabled={isUpdatingStatus}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                      >
                        Finalize & Mark Completed
                      </Button>
                    )}
                    {selectedLeg.status === 'COMPLETED' && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs py-1 px-3">
                        ✓ Journey Completed & Closed
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 4. Trip Audit History */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                    Trip Progression Event Log ({legLogs.length})
                  </span>
                  {legLogs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No progression events logged yet.</p>
                  ) : (
                    <div className="divide-y divide-border/60 text-xs max-h-36 overflow-y-auto">
                      {legLogs.map((log) => (
                        <div key={log.id} className="py-2 space-y-0.5">
                          <p className="text-foreground">{log.description}</p>
                          <span className="text-[10px] text-muted-foreground font-mono block">
                            {formatDisplayDateTime(log.timestamp)} • Action: {log.action}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedLegId(null)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
