'use client';

import * as React from 'react';
import Link from 'next/navigation';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Calendar,
  Users,
  ArrowRight,
  Car,
  FileQuestion,
  ChevronRight,
} from 'lucide-react';
import { VehicleRequest, RequestStatus } from '@/types/domain';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { formatDisplayDateTime } from '@/lib/utils/date';
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
import { EmptyState } from '@/components/shared/empty-state';

export interface RequestTableProps {
  requests: VehicleRequest[];
}

type StatusFilter = 'ALL' | RequestStatus;

export function RequestTable({ requests }: RequestTableProps) {
  const router = useRouter();
  const tripLegs = useFleetFlowStore((s) => s.tripLegs);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL');

  // Filter requests
  const filteredRequests = React.useMemo(() => {
    return requests.filter((req) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && req.status !== statusFilter) {
        return false;
      }

      // 2. Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();

      // Check request ID and purpose
      if (req.id.toLowerCase().includes(q) || req.purpose.toLowerCase().includes(q)) {
        return true;
      }

      // Check associated trip legs for pickup / destination
      const reqLegs = tripLegs.filter((l) => l.requestId === req.id);
      const matchesLegs = reqLegs.some(
        (l) =>
          l.pickupLocation.toLowerCase().includes(q) ||
          l.destination.toLowerCase().includes(q)
      );

      return matchesLegs;
    });
  }, [requests, statusFilter, searchQuery, tripLegs]);

  // Status badge styling helper
  const renderStatusBadge = (status: RequestStatus) => {
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

  const getRequestRoute = (requestId: string) => {
    const outbound = tripLegs.find((l) => l.requestId === requestId && l.legType === 'OUTBOUND');
    if (!outbound) return { pickup: '—', destination: '—', departure: '—' };
    return {
      pickup: outbound.pickupLocation,
      destination: outbound.destination,
      departure: outbound.scheduledDeparture,
    };
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, route, purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'PENDING', 'APPROVED', 'CANCELLED', 'REJECTED'] as StatusFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab === 'ALL' ? 'All Requests' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Content */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          title="No requests match your filter"
          description={
            searchQuery
              ? `No requests matched "${searchQuery}". Try a different keyword or reset filters.`
              : 'You have not submitted any vehicle requests matching this status.'
          }
          icon={FileQuestion}
          actionLabel="Create New Request"
          onAction={() => router.push('/employee/requests/new')}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[120px]">Request ID</TableHead>
                  <TableHead className="w-[110px]">Type</TableHead>
                  <TableHead>Route (Pickup → Destination)</TableHead>
                  <TableHead>Scheduled Departure</TableHead>
                  <TableHead className="w-[100px] text-center">Pax</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => {
                  const route = getRequestRoute(req.id);
                  return (
                    <TableRow
                      key={req.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => router.push(`/employee/requests/${req.id}`)}
                    >
                      <TableCell className="font-mono font-medium text-xs text-primary">
                        {req.id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {req.tripType === 'ROUND_TRIP' ? 'Round-Trip' : 'One-Way'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="font-medium text-foreground line-clamp-1">
                            {route.pickup}
                          </span>
                          <span className="text-muted-foreground line-clamp-1 flex items-center gap-1">
                            <span className="text-slate-400">→</span> {route.destination}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDisplayDateTime(route.departure)}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="inline-flex items-center gap-1 font-medium text-foreground">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {req.passengerCount}
                        </span>
                      </TableCell>
                      <TableCell>{renderStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/employee/requests/${req.id}`);
                          }}
                          className="h-8 px-2 text-xs text-primary"
                        >
                          <span>View</span>
                          <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredRequests.map((req) => {
              const route = getRequestRoute(req.id);
              return (
                <div
                  key={req.id}
                  onClick={() => router.push(`/employee/requests/${req.id}`)}
                  className="rounded-xl border bg-card p-4 shadow-sm hover:border-primary/50 transition-colors cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-xs text-primary">
                      {req.id}
                    </span>
                    {renderStatusBadge(req.status)}
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <span className="line-clamp-1">{route.pickup}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="line-clamp-1">{route.destination}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDisplayDateTime(route.departure)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {req.passengerCount} pax
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t text-xs">
                    <Badge variant="outline" className="text-[10px]">
                      {req.tripType === 'ROUND_TRIP' ? 'Round-Trip' : 'One-Way'}
                    </Badge>
                    <span className="text-primary font-medium flex items-center gap-0.5">
                      View Details <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
