'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Car,
  Users,
  FileText,
  Calendar,
  AlertTriangle,
  UserCheck,
  Building,
  Phone,
  Mail,
  Navigation,
} from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { requestService } from '@/services/request-service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatDisplayDateTime } from '@/lib/utils/date';
import { ActivityTimeline } from '@/features/vehicle-requests/components/activity-timeline';
import { selectActivityTimeline } from '@/features/vehicle-requests/selectors/activity-selectors';
import { RequestStatus } from '@/types/domain';

export default function AdminRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const requestId = params?.id;

  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const requests = useFleetFlowStore((s) => s.requests);
  const users = useFleetFlowStore((s) => s.users);
  const tripLegs = useFleetFlowStore((s) => s.tripLegs);
  const passengers = useFleetFlowStore((s) => s.passengers);
  const assignments = useFleetFlowStore((s) => s.assignments);
  const vehicles = useFleetFlowStore((s) => s.vehicles);
  const drivers = useFleetFlowStore((s) => s.drivers);
  const activityLogs = useFleetFlowStore((s) => s.activityLogs);

  const request = requests.find((r) => r.id === requestId);
  const requester = request ? users.find((u) => u.id === request.requesterId) : undefined;
  const reqLegs = tripLegs.filter((l) => l.requestId === requestId);
  const reqPassengers = passengers.filter((p) => p.requestId === requestId);
  const reqAssignments = assignments.filter((a) =>
    reqLegs.some((l) => l.id === a.tripLegId)
  );

  // Modal dialog states
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [rejectionError, setRejectionError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [feedbackMessage, setFeedbackMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Timeline events
  const timelineItems = React.useMemo(() => {
    if (!requestId) return [];
    return selectActivityTimeline(
      { activityLogs, users, tripLegs },
      requestId
    );
  }, [activityLogs, users, tripLegs, requestId]);

  if (!request) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 text-center space-y-4">
        <h2 className="text-xl font-bold">Request Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested transportation request ID ({requestId}) does not exist.
        </p>
        <Button onClick={() => router.push('/admin/requests')} variant="outline">
          Back to Request Queue
        </Button>
      </div>
    );
  }

  // Handle Approve
  const handleApprove = async () => {
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      await requestService.approveRequest(request.id, currentUserId);
      setFeedbackMessage({
        type: 'success',
        text: `Request ${request.id} has been approved successfully. You may now assign a vehicle and driver.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve request.';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      setRejectionError('A clear justification is required for rejecting a transportation request.');
      return;
    }
    setIsSubmitting(true);
    setRejectionError(null);
    try {
      await requestService.rejectRequest(request.id, currentUserId, rejectionReason);
      setRejectModalOpen(false);
      setRejectionReason('');
      setFeedbackMessage({
        type: 'success',
        text: `Request ${request.id} has been rejected with justification recorded.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject request.';
      setRejectionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="pending">Pending Review</Badge>;
      case 'APPROVED':
        return <Badge variant="approved">Approved</Badge>;
      case 'ASSIGNED':
        return <Badge variant="assigned">Assigned</Badge>;
      case 'COMPLETED':
        return <Badge variant="completed">Completed</Badge>;
      case 'REJECTED':
        return <Badge variant="rejected">Rejected</Badge>;
      case 'CANCELLED':
        return <Badge variant="cancelled">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container max-w-full md:max-w-6xl lg:max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 md:px-6 lg:px-8 space-y-6">
      {/* Back Link & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <Link
            href="/admin/requests"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors w-fit mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to Request Queue</span>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
              {request.id}
            </h1>
            {renderStatusBadge(request.status)}
            <Badge variant="outline" className="text-xs">
              {request.tripType === 'ROUND_TRIP' ? 'Round-Trip' : 'One-Way'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Submitted: {formatDisplayDateTime(request.createdAt)}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {request.status === 'PENDING' && (
            <>
              <Button
                variant="default"
                onClick={handleApprove}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs h-9 px-4 flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Approve Request</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setRejectModalOpen(true)}
                disabled={isSubmitting}
                className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 text-xs h-9 px-4 flex items-center gap-1.5"
              >
                <XCircle className="h-4 w-4" />
                <span>Reject Request</span>
              </Button>
            </>
          )}

          {request.status === 'APPROVED' && (
            <Link
              href={`/admin/assignments?requestId=${request.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-colors"
            >
              <UserCheck className="h-4 w-4" />
              <span>Proceed to Assignment</span>
            </Link>
          )}

          {request.status === 'ASSIGNED' && (
            <Link
              href="/admin/trips"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md border border-border bg-card text-foreground hover:bg-muted shadow-xs transition-colors"
            >
              <Navigation className="h-4 w-4 text-primary" />
              <span>Monitor in Trip Center</span>
            </Link>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Rejection Justification Alert if REJECTED */}
      {request.status === 'REJECTED' && request.rejectionReason && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-900 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-xs text-red-800">
            <XCircle className="h-4 w-4 text-red-600" />
            <span>Administrative Rejection Justification</span>
          </div>
          <p className="text-xs text-red-700 pl-6">
            {request.rejectionReason}
          </p>
        </div>
      )}

      {/* Main Grid: Details on Left, Side Panels on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Journey Legs, Purpose, Passengers, Assignments */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Journey Itinerary Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" />
                <span>Journey Itinerary ({reqLegs.length} Leg{reqLegs.length > 1 ? 's' : ''})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div className="divide-y divide-border/60">
                {reqLegs.map((leg) => {
                  const legAssignment = assignments.find((a) => a.tripLegId === leg.id && a.status === 'ACTIVE');
                  const assignedVehicle = legAssignment ? vehicles.find((v) => v.id === legAssignment.vehicleId) : undefined;
                  const assignedDriver = legAssignment ? drivers.find((d) => d.id === legAssignment.driverId) : undefined;
                  const driverUser = assignedDriver ? users.find((u) => u.id === assignedDriver.userId) : undefined;

                  return (
                    <div key={leg.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                            {leg.legType} Leg
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">{leg.id}</span>
                        </div>
                        <Badge variant="outline" className="text-[11px] font-normal">
                          Status: {leg.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                        <div className="p-2.5 rounded-md bg-muted/30 border border-border/50">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-0.5">
                            Pickup Location & Time
                          </span>
                          <span className="font-medium text-foreground block">{leg.pickupLocation}</span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {formatDisplayDateTime(leg.scheduledDeparture)}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-md bg-muted/30 border border-border/50">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-0.5">
                            Destination & Estimated Arrival
                          </span>
                          <span className="font-medium text-foreground block">{leg.destination}</span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {formatDisplayDateTime(leg.scheduledArrival)}
                          </span>
                        </div>
                      </div>

                      {/* Leg Assignment Summary if allocated */}
                      {legAssignment && assignedVehicle && driverUser && (
                        <div className="p-2.5 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-between text-xs text-indigo-950 mt-2">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-indigo-700" />
                            <span>
                              <strong>{assignedVehicle.model}</strong> ({assignedVehicle.registrationNumber})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 font-medium">
                            <User className="h-3.5 w-3.5 text-indigo-700" />
                            <span>Driver: {driverUser.name}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 2. Business Purpose & Notes */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>Business Purpose & Operational Notes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-1 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                  Stated Travel Purpose
                </span>
                <p className="text-sm font-medium text-foreground p-3 rounded-md bg-muted/30 border border-border/50">
                  {request.purpose}
                </p>
              </div>
              {request.notes && (
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                    Special Equipment or Cargo Notes
                  </span>
                  <p className="text-xs text-muted-foreground p-2.5 rounded-md bg-muted/20 border border-border/40 font-mono">
                    {request.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Passenger Manifest */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>Passenger Manifest ({request.passengerCount} Total)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="space-y-2 text-xs">
                {/* Primary Requester */}
                <div className="p-2.5 rounded-md border border-primary/20 bg-primary/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <div>
                      <span className="font-semibold text-foreground">{requester?.name || 'Requester'}</span>
                      <span className="text-muted-foreground ml-2 text-[11px]">(Lead Passenger)</span>
                    </div>
                  </div>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {requester?.department || 'Employee'}
                  </span>
                </div>

                {/* Additional Colleagues */}
                {reqPassengers.map((pas) => (
                  <div
                    key={pas.id}
                    className="p-2.5 rounded-md border border-border/60 bg-muted/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-slate-400" />
                      <span className="font-medium text-foreground">{pas.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px]">
                      {pas.employeeId && <span>{pas.employeeId}</span>}
                      {pas.department && <span>{pas.department}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): Requester Info & Activity Timeline */}
        <div className="space-y-6">
          {/* Employee Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span>Employee Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-1 text-xs">
              <div className="space-y-1">
                <span className="text-sm font-semibold text-foreground block">
                  {requester?.name || request.requesterId}
                </span>
                <span className="text-xs text-muted-foreground block font-mono">
                  ID: {request.requesterId}
                </span>
              </div>
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="h-3.5 w-3.5" />
                  <span>{requester?.department || 'Corporate Staff'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="font-mono">{requester?.email || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span className="font-mono">{requester?.phone || '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>Audit & Activity Trail</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Historical record of review, status changes, and dispatch
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-1">
              <ActivityTimeline items={timelineItems} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject Modal Dialog */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span>Reject Transportation Request</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Please provide a clear business justification for rejecting request <strong>{request.id}</strong>.
              This will be recorded in the audit trail and sent to the employee.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label htmlFor="rejection-reason" className="text-xs font-semibold text-foreground block">
              Rejection Reason <span className="text-red-600">*</span>
            </label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (rejectionError) setRejectionError(null);
              }}
              placeholder="e.g., No multi-passenger vehicles available for requested peak holiday window; please consolidate transit."
              rows={4}
              className="text-xs"
            />
            {rejectionError && (
              <p className="text-xs text-red-600 font-medium">{rejectionError}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectModalOpen(false);
                setRejectionError(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirmReject}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
