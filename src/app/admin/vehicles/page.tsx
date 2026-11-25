'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Car,
  Search,
  Users,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Navigation,
  ShieldCheck,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { vehicleService, VehicleDirectoryItem } from '@/services/vehicle-service';
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
import { formatDisplayDateTime } from '@/lib/utils/date';

export default function AdminVehiclesDirectoryPage() {
  const isHydrated = useFleetFlowStore((s) => s.isHydrated);
  const vehicles = useFleetFlowStore((s) => s.vehicles);
  const assignments = useFleetFlowStore((s) => s.assignments);
  const tripLegs = useFleetFlowStore((s) => s.tripLegs);

  const [directoryItems, setDirectoryItems] = React.useState<VehicleDirectoryItem[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Load directory items via service
  const loadVehicles = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await vehicleService.getVehicleDirectory();
      setDirectoryItems(items);
    } catch (err) {
      console.error('Failed to load vehicle directory:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isHydrated) {
      loadVehicles();
    }
  }, [isHydrated, vehicles, assignments, tripLegs, loadVehicles]);

  // Filtered items
  const filteredVehicles = React.useMemo(() => {
    return vehicleService.filterVehicles(directoryItems, statusFilter, searchQuery);
  }, [directoryItems, statusFilter, searchQuery]);

  // Metrics
  const totalCount = directoryItems.length;
  const availableCount = directoryItems.filter((v) => v.status === 'AVAILABLE').length;
  const inUseCount = directoryItems.filter((v) => v.status === 'IN_USE').length;
  const totalCapacity = directoryItems.reduce((acc, v) => acc + v.capacity, 0);

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
            <Car className="h-6 w-6 text-primary" aria-hidden="true" />
            <span>Vehicle Fleet Directory</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage, inspect, and track physical vehicle assets, capacities, and real-time operational status.
          </p>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 flex items-center gap-3.5 bg-card shadow-xs border-border">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
            <Car className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Fleet
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
              In Use / On Trip
            </p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-700 tracking-tight">
              {inUseCount}
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center gap-3.5 bg-card shadow-xs border-border">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Capacity
            </p>
            <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {totalCapacity} Seats
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
              placeholder="Search by model, registration number, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
              aria-label="Search vehicles"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="group" aria-label="Filter vehicles by status">
            {[
              { label: 'All', value: 'ALL', count: totalCount },
              { label: 'Available', value: 'AVAILABLE', count: availableCount },
              { label: 'In Use', value: 'IN_USE', count: inUseCount },
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

      {/* Vehicle Directory Content */}
      {filteredVehicles.length === 0 ? (
        <Card className="p-8 text-center bg-card border-border">
          <EmptyState
            title="No vehicles found"
            description={
              searchQuery || statusFilter !== 'ALL'
                ? 'No fleet vehicles match your search query or selected status filter.'
                : 'No vehicles are registered in the system.'
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
                    <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider">
                      Vehicle ID
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                      Registration
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                      Make & Model
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                      Capacity
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                      Operational Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                      Active Assignment / Location
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id} className="hover:bg-muted/20">
                      {/* Vehicle ID */}
                      <TableCell className="font-mono text-xs font-semibold text-foreground">
                        {vehicle.id}
                      </TableCell>

                      {/* Registration */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs font-bold bg-slate-100 text-slate-800 border-slate-300 px-2 py-0.5"
                        >
                          {vehicle.registrationNumber}
                        </Badge>
                      </TableCell>

                      {/* Make & Model */}
                      <TableCell className="font-medium text-sm text-foreground">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{vehicle.model}</span>
                        </div>
                      </TableCell>

                      {/* Capacity */}
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{vehicle.capacity} Passengers</span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {vehicle.status === 'AVAILABLE' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-medium gap-1 hover:bg-emerald-100">
                            <CheckCircle2 className="h-3 w-3" />
                            AVAILABLE
                          </Badge>
                        ) : (
                          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs font-medium gap-1 hover:bg-indigo-100">
                            <Car className="h-3 w-3" />
                            IN USE
                          </Badge>
                        )}
                      </TableCell>

                      {/* Current Assignment / Location */}
                      <TableCell className="text-xs text-muted-foreground">
                        {vehicle.status === 'IN_USE' && vehicle.activeAssignment ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-foreground font-medium">
                              <Navigation className="h-3 w-3 text-indigo-600 flex-shrink-0" />
                              <span className="truncate max-w-[240px]" title={`${vehicle.activeAssignment.pickupLocation} -> ${vehicle.activeAssignment.destination}`}>
                                {vehicle.activeAssignment.pickupLocation} → {vehicle.activeAssignment.destination}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>Leg: <span className="font-mono">{vehicle.activeAssignment.tripLegId}</span></span>
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
                              Stationed at Central Depo
                            </span>
                            {vehicle.activeAssignment && (
                              <div className="text-[11px] text-muted-foreground pl-4">
                                Scheduled: <span className="font-mono">{vehicle.activeAssignment.tripLegId}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile Stacked Card View (< 768px) */}
          <div className="grid grid-cols-1 gap-3.5 md:hidden">
            {filteredVehicles.map((vehicle) => (
              <Card key={vehicle.id} className="p-4 bg-card border-border shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        {vehicle.id}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-[11px] font-bold bg-slate-100 text-slate-800 border-slate-300"
                      >
                        {vehicle.registrationNumber}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Car className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{vehicle.model}</span>
                    </h3>
                  </div>

                  {vehicle.status === 'AVAILABLE' ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-medium">
                      AVAILABLE
                    </Badge>
                  ) : (
                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs font-medium">
                      IN USE
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border">
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>Capacity: {vehicle.capacity}</span>
                  </div>
                </div>

                {vehicle.status === 'IN_USE' && vehicle.activeAssignment ? (
                  <div className="p-2.5 rounded-md bg-muted/40 text-xs space-y-1">
                    <div className="font-medium text-foreground flex items-center gap-1">
                      <Navigation className="h-3 w-3 text-indigo-600" />
                      <span>{vehicle.activeAssignment.pickupLocation} → {vehicle.activeAssignment.destination}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span>Status: {vehicle.activeAssignment.legStatus}</span>
                      <Link href="/admin/trips" className="text-primary font-semibold hover:underline">
                        Monitor Trip
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" />
                    Stationed at Central Depo {vehicle.activeAssignment ? `(Scheduled: ${vehicle.activeAssignment.tripLegId})` : '(Ready for dispatch)'}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
