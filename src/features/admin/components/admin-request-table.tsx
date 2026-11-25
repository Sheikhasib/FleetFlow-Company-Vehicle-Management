'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  Users,
  ArrowRight,
  Car,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { VehicleRequest, RequestStatus, TripType, User, TripLeg } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDisplayDateTime } from '@/lib/utils/date';
import { EmptyState } from '@/components/shared/empty-state';

export interface AdminRequestTableProps {
  requests: VehicleRequest[];
  users: User[];
  tripLegs: TripLeg[];
}

export function AdminRequestTable({ requests, users, tripLegs }: AdminRequestTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStatus = (searchParams.get('status') as RequestStatus | null) || 'ALL';

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>(initialStatus);
  const [tripTypeFilter, setTripTypeFilter] = React.useState<string>('ALL');

  // User and TripLeg lookups
  const userMap = React.useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const legsByRequest = React.useMemo(() => {
    const map = new Map<string, TripLeg[]>();
    tripLegs.forEach((l) => {
      const arr = map.get(l.requestId) || [];
      arr.push(l);
      map.set(l.requestId, arr);
    });
    return map;
  }, [tripLegs]);

  // Filter requests
  const filteredRequests = React.useMemo(() => {
    return requests.filter((req) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && req.status !== statusFilter) {
        return false;
      }

      // 2. Trip Type Filter
      if (tripTypeFilter !== 'ALL' && req.tripType !== tripTypeFilter) {
        return false;
      }

      // 3. Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      if (req.id.toLowerCase().includes(q) || req.purpose.toLowerCase().includes(q)) {
        return true;
      }

      const requester = userMap.get(req.requesterId);
      if (
        requester &&
        (requester.name.toLowerCase().includes(q) ||
          requester.department?.toLowerCase().includes(q) ||
          requester.email.toLowerCase().includes(q))
      ) {
        return true;
      }

      const reqLegs = legsByRequest.get(req.id) || [];
      return reqLegs.some(
        (l) =>
          l.pickupLocation.toLowerCase().includes(q) ||
          l.destination.toLowerCase().includes(q)
      );
    });
  }, [requests, statusFilter, tripTypeFilter, searchQuery, userMap, legsByRequest]);

  const renderStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="pending">Pending</Badge>;
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

  const statusOptions: Array<{ value: string; label: string; count?: number }> = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending', count: requests.filter((r) => r.status === 'PENDING').length },
    { value: 'APPROVED', label: 'Approved', count: requests.filter((r) => r.status === 'APPROVED').length },
    { value: 'ASSIGNED', label: 'Assigned', count: requests.filter((r) => r.status === 'ASSIGNED').length },
    { value: 'COMPLETED', label: 'Completed', count: requests.filter((r) => r.status === 'COMPLETED').length },
    { value: 'REJECTED', label: 'Rejected', count: requests.filter((r) => r.status === 'REJECTED').length },
    { value: 'CANCELLED', label: 'Cancelled', count: requests.filter((r) => r.status === 'CANCELLED').length },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-4 rounded-lg border border-border shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, employee, route, purpose..."
            className="pl-9 h-9 text-xs"
            aria-label="Search requests"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-2.5 rounded-md border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter by request status"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} {opt.count !== undefined ? `(${opt.count})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Trip Type Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Type:</span>
            <select
              value={tripTypeFilter}
              onChange={(e) => setTripTypeFilter(e.target.value)}
              className="h-9 px-2.5 rounded-md border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter by trip type"
            >
              <option value="ALL">All Types</option>
              <option value="ONE_WAY">One-Way</option>
              <option value="ROUND_TRIP">Round-Trip</option>
            </select>
          </div>

          {(statusFilter !== 'ALL' || tripTypeFilter !== 'ALL' || searchQuery.trim()) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('ALL');
                setTripTypeFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs h-9 text-muted-foreground hover:text-foreground"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Requests Table Container */}
      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={FileSpreadsheet}
              title="No requests match criteria"
              description="Try adjusting your status filter or search query to find matching transportation requests."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[110px]">Request ID</TableHead>
                  <TableHead className="w-[180px]">Employee</TableHead>
                  <TableHead>Route (Pickup → Destination)</TableHead>
                  <TableHead className="w-[140px]">Travel Date</TableHead>
                  <TableHead className="w-[70px] text-center">Pax</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[90px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => {
                  const requester = userMap.get(req.requesterId);
                  const legs = legsByRequest.get(req.id) || [];
                  const outboundLeg = legs.find((l) => l.legType === 'OUTBOUND') || legs[0];

                  return (
                    <TableRow
                      key={req.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => router.push(`/admin/requests/${req.id}`)}
                    >
                      {/* ID */}
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {req.id}
                      </TableCell>

                      {/* Employee */}
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold text-foreground line-clamp-1">
                            {requester?.name || req.requesterId}
                          </span>
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {requester?.department || 'Employee'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Route */}
                      <TableCell>
                        {outboundLeg ? (
                          <div className="flex flex-col text-xs">
                            <span className="font-medium text-foreground line-clamp-1">
                              {outboundLeg.pickupLocation}
                            </span>
                            <span className="text-muted-foreground line-clamp-1 flex items-center gap-1 text-[11px]">
                              <span className="text-slate-400">→</span> {outboundLeg.destination}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Travel Date */}
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {outboundLeg ? formatDisplayDateTime(outboundLeg.scheduledDeparture) : '—'}
                      </TableCell>

                      {/* Pax */}
                      <TableCell className="text-center text-xs">
                        <span className="inline-flex items-center gap-1 font-medium text-foreground">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {req.passengerCount}
                        </span>
                      </TableCell>

                      {/* Trip Type */}
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-normal py-0">
                          {req.tripType === 'ROUND_TRIP' ? 'Round-Trip' : 'One-Way'}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell>{renderStatusBadge(req.status)}</TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={req.status === 'PENDING' ? 'default' : 'outline'}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/requests/${req.id}`);
                          }}
                          className="h-7 text-xs px-2.5"
                        >
                          Review
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
    </div>
  );
}
