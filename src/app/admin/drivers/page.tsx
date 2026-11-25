'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Phone,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Navigation,
  ShieldCheck,
  UserCheck,
  Moon,
  Mail,
} from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { driverService, DriverDirectoryItem } from '@/services/driver-service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/empty-state';

export default function AdminDriversDirectoryPage() {
  const isHydrated = useFleetFlowStore((s) => s.isHydrated);
  const drivers = useFleetFlowStore((s) => s.drivers);
  const users = useFleetFlowStore((s) => s.users);
  const assignments = useFleetFlowStore((s) => s.assignments);
  const tripLegs = useFleetFlowStore((s) => s.tripLegs);

  const [directoryItems, setDirectoryItems] = React.useState<DriverDirectoryItem[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Load driver directory via service
  const loadDrivers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await driverService.getDriverDirectory();
      setDirectoryItems(items);
    } catch (err) {
      console.error('Failed to load driver directory:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isHydrated) {
      loadDrivers();
    }
  }, [isHydrated, drivers, users, assignments, tripLegs, loadDrivers]);

  // Filtered items
  const filteredDrivers = React.useMemo(() => {
    return driverService.filterDrivers(directoryItems, statusFilter, searchQuery);
  }, [directoryItems, statusFilter, searchQuery]);

  // Metrics
  const totalCount = directoryItems.length;
  const availableCount = directoryItems.filter((d) => d.status === 'AVAILABLE').length;
  const onTripCount = directoryItems.filter((d) => d.status === 'ON_TRIP').length;
  const offDutyCount = directoryItems.filter((d) => d.status === 'OFF_DUTY').length;

  return (
    <div className="container max-w-full md:max-w-6xl lg:max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 md:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="h-6 w-6 text-primary" aria-hidden="true" />
            <span>Driver Operations Directory</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor operational availability, contact information, and active trip assignments for company drivers.
          </p>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 flex items-center gap-3.5 bg-card shadow-xs border-border">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Drivers
            </p>
            <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {totalCount}
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center gap-3.5 bg-card shadow-xs border-border">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Available
            </p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-700 tracking-tight">
              {availableCount}
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center gap-3.5 bg-card shadow-xs border-border">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700">
            <Navigation className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              On Trip
            </p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-700 tracking-tight">
              {onTripCount}
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center gap-3.5 bg-card shadow-xs border-border">
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
            <Moon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Off Duty
            </p>
            <p className="text-xl sm:text-2xl font-bold text-slate-700 tracking-tight">
              {offDutyCount}
            </p>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-card shadow-xs border-border">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by driver name, phone number, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
              aria-label="Search drivers"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="group" aria-label="Filter drivers by status">
            {[
              { label: 'All', value: 'ALL', count: totalCount },
              { label: 'Available', value: 'AVAILABLE', count: availableCount },
              { label: 'On Trip', value: 'ON_TRIP', count: onTripCount },
              { label: 'Off Duty', value: 'OFF_DUTY', count: offDutyCount },
            ].map((filter) => {
              const isActive = statusFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[36px] ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  aria-pressed={isActive}
                >
                  <span>{filter.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-background text-muted-foreground'
                    }`}
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Driver Directory Content */}
      {filteredDrivers.length === 0 ? (
        <Card className="p-8 text-center bg-card border-border">
          <EmptyState
            title="No drivers found"
            description={
              searchQuery || statusFilter !== 'ALL'
                ? 'No drivers match your search query or selected status filter.'
                : 'No driver personnel are registered in the system.'
            }
          />
          {(searchQuery || statusFilter !== 'ALL') && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop & Tablet Table (>= 768px) */}
          <div className="hidden md:block">
            <Card className="overflow-hidden bg-card border-border shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[110px] text-xs font-semibold uppercase tracking-wider">
                      Driver ID
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                      Driver Personnel
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                      Contact Phone
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                      Department
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                      Operational Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                      Active Assignment / Trip
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver) => {
                    const initials = driver.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2);

                    return (
                      <TableRow key={driver.id} className="hover:bg-muted/20">
                        {/* Driver ID */}
                        <TableCell className="font-mono text-xs font-semibold text-foreground">
                          {driver.id}
                        </TableCell>

                        {/* Driver Name with Avatar */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-sm text-foreground">
                                {driver.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span>{driver.email}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Phone */}
                        <TableCell className="font-mono text-xs text-foreground">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{driver.phone}</span>
                          </div>
                        </TableCell>

                        {/* Department */}
                        <TableCell className="text-xs text-muted-foreground">
                          {driver.department}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {driver.status === 'AVAILABLE' && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-medium gap-1 hover:bg-emerald-100">
                              <CheckCircle2 className="h-3 w-3" />
                              AVAILABLE
                            </Badge>
                          )}
                          {driver.status === 'ON_TRIP' && (
                            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs font-medium gap-1 hover:bg-indigo-100">
                              <Navigation className="h-3 w-3" />
                              ON TRIP
                            </Badge>
                          )}
                          {driver.status === 'OFF_DUTY' && (
                            <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-xs font-medium gap-1 hover:bg-slate-100">
                              <Moon className="h-3 w-3" />
                              OFF DUTY
                            </Badge>
                          )}
                        </TableCell>

                        {/* Active Assignment / Trip */}
                        <TableCell className="text-xs text-muted-foreground">
                          {driver.status === 'ON_TRIP' && driver.activeAssignment ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-foreground font-medium">
                                <Navigation className="h-3 w-3 text-indigo-600 flex-shrink-0" />
                                <span className="truncate max-w-[240px]" title={`${driver.activeAssignment.pickupLocation} -> ${driver.activeAssignment.destination}`}>
                                  {driver.activeAssignment.pickupLocation} → {driver.activeAssignment.destination}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span>Leg: <span className="font-mono">{driver.activeAssignment.tripLegId}</span></span>
                                <span>•</span>
                                <Link
                                  href={`/admin/trips`}
                                  className="text-primary hover:underline font-semibold"
                                >
                                  View Trip Monitor
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="text-muted-foreground italic flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                Available for immediate dispatch
                              </span>
                              {driver.activeAssignment && (
                                <div className="text-[11px] text-muted-foreground pl-4">
                                  Scheduled: <span className="font-mono">{driver.activeAssignment.tripLegId}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile Stacked Card View (< 768px) */}
          <div className="grid grid-cols-1 gap-3.5 md:hidden">
            {filteredDrivers.map((driver) => {
              const initials = driver.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2);

              return (
                <Card key={driver.id} className="p-4 bg-card border-border shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                        {initials}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground">
                          {driver.name}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          ID: {driver.id}
                        </div>
                      </div>
                    </div>

                    {driver.status === 'AVAILABLE' && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-medium">
                        AVAILABLE
                      </Badge>
                    )}
                    {driver.status === 'ON_TRIP' && (
                      <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs font-medium">
                        ON TRIP
                      </Badge>
                    )}
                    {driver.status === 'OFF_DUTY' && (
                      <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-xs font-medium">
                        OFF DUTY
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 pt-1 border-t border-border text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 font-mono text-foreground">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{driver.phone}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {driver.department}
                    </div>
                  </div>

                  {driver.status === 'ON_TRIP' && driver.activeAssignment ? (
                    <div className="p-2.5 rounded-md bg-muted/40 text-xs space-y-1">
                      <div className="font-medium text-foreground flex items-center gap-1">
                        <Navigation className="h-3 w-3 text-indigo-600" />
                        <span>{driver.activeAssignment.pickupLocation} → {driver.activeAssignment.destination}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                        <span>Status: {driver.activeAssignment.legStatus}</span>
                        <Link href="/admin/trips" className="text-primary font-semibold hover:underline">
                          Monitor Trip
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      Ready for dispatch assignment {driver.activeAssignment ? `(Scheduled: ${driver.activeAssignment.tripLegId})` : ''}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
