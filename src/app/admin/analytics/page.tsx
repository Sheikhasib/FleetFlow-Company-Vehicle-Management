'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  MapPin,
  Compass,
  Building,
  CheckCircle2,
  Car,
  Users,
  ArrowLeft,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import {
  analyticsService,
  MonthlyVolumeItem,
  DestinationVolumeItem,
  TripTypeVolumeItem,
  DepartmentVolumeItem,
  DashboardSummary,
} from '@/services/analytics-service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MonthlyVolumeChart } from '@/features/admin/components/monthly-volume-chart';
import { RequestStatusChart } from '@/features/admin/components/request-status-chart';
import { RequestStatus } from '@/types/domain';

export default function AdminAnalyticsPage() {
  const isHydrated = useFleetFlowStore((s) => s.isHydrated);
  const requests = useFleetFlowStore((s) => s.requests);
  const tripLegs = useFleetFlowStore((s) => s.tripLegs);
  const vehicles = useFleetFlowStore((s) => s.vehicles);
  const drivers = useFleetFlowStore((s) => s.drivers);
  const users = useFleetFlowStore((s) => s.users);

  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [statusDist, setStatusDist] = React.useState<Record<RequestStatus, number> | null>(null);
  const [monthlyVolume, setMonthlyVolume] = React.useState<MonthlyVolumeItem[]>([]);
  const [destinations, setDestinations] = React.useState<DestinationVolumeItem[]>([]);
  const [tripTypes, setTripTypes] = React.useState<TripTypeVolumeItem[]>([]);
  const [departments, setDepartments] = React.useState<DepartmentVolumeItem[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = React.useState<string>('ALL');

  // Load analytics via service
  const loadAnalytics = React.useCallback(async () => {
    try {
      const [sum, dist, monthly, dests, types, depts] = await Promise.all([
        analyticsService.getDashboardSummary(),
        analyticsService.getRequestStatusDistribution(),
        analyticsService.getMonthlyRequestCounts(),
        analyticsService.getFrequentlyRequestedDestinations(6),
        analyticsService.getTripTypeCounts(),
        analyticsService.getDepartmentDistribution(),
      ]);

      setSummary(sum);
      setStatusDist(dist);
      setMonthlyVolume(monthly);
      setDestinations(dests);
      setTripTypes(types);
      setDepartments(depts);
    } catch (err) {
      console.error('Failed to load fleet analytics:', err);
    }
  }, []);

  React.useEffect(() => {
    if (isHydrated) {
      loadAnalytics();
    }
  }, [isHydrated, requests, tripLegs, vehicles, drivers, users, loadAnalytics]);

  const totalVehicles = vehicles.length;
  const inUseVehicles = vehicles.filter((v) => v.status === 'IN_USE').length;
  const vehicleUtilization = totalVehicles > 0 ? Math.round((inUseVehicles / totalVehicles) * 100) : 0;

  const totalDrivers = drivers.length;
  const onTripDrivers = drivers.filter((d) => d.status === 'ON_TRIP').length;
  const driverUtilization = totalDrivers > 0 ? Math.round((onTripDrivers / totalDrivers) * 100) : 0;

  const maxDestCount = destinations.length > 0 ? Math.max(...destinations.map((d) => d.count), 1) : 1;
  const maxDeptCount = departments.length > 0 ? Math.max(...departments.map((d) => d.count), 1) : 1;

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
            <BarChart3 className="h-6 w-6 text-primary" aria-hidden="true" />
            <span>Fleet Analytics & Operational Intelligence</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Strategic operational reporting on transportation demand volume, lifecycle distribution, routes, and fleet asset utilization.
          </p>
        </div>

        {/* Timeframe Scope Selector */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-card border border-border p-1 rounded-lg">
          {[
            { label: 'All Historical', value: 'ALL' },
            { label: 'Current Quarter', value: 'Q4' },
          ].map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setSelectedTimeframe(t.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedTimeframe === t.value
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Utilization & Performance KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 bg-card shadow-xs border-border flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Demand
            </p>
            <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {summary?.totalRequests || 0} Requests
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 bg-card shadow-xs border-border flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Fulfillment Rate
            </p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-700 tracking-tight">
              {summary?.totalRequests
                ? Math.round(((summary.completedTrips + summary.approvedRequests) / summary.totalRequests) * 100)
                : 0}
              %
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 bg-card shadow-xs border-border flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700">
            <Car className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Fleet Utilization
            </p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-700 tracking-tight">
              {vehicleUtilization}% <span className="text-xs font-normal text-muted-foreground">({inUseVehicles}/{totalVehicles})</span>
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 bg-card shadow-xs border-border flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Driver Utilization
            </p>
            <p className="text-xl sm:text-2xl font-bold text-amber-700 tracking-tight">
              {driverUtilization}% <span className="text-xs font-normal text-muted-foreground">({onTripDrivers}/{totalDrivers})</span>
            </p>
          </div>
        </Card>
      </div>

      {/* Row 1: Charts (Monthly Volume & Lifecycle Status) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyVolumeChart data={monthlyVolume} />
        {statusDist ? (
          <RequestStatusChart distribution={statusDist} />
        ) : (
          <div className="h-64 rounded-xl border border-border bg-card animate-pulse" />
        )}
      </div>

      {/* Row 2: Destination Frequency & Trip Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frequently Requested Destinations */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>Frequently Requested Destinations</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Most recurring journey dropoff sites across all trip legs
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                Top {destinations.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {destinations.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No destination data recorded.
              </p>
            ) : (
              <div className="space-y-3.5">
                {destinations.map((dest, idx) => {
                  const pct = Math.round((dest.count / maxDestCount) * 100);
                  return (
                    <div key={dest.destination} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-semibold text-muted-foreground w-4">
                            #{idx + 1}
                          </span>
                          <span className="font-medium text-foreground truncate" title={dest.destination}>
                            {dest.destination}
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-foreground flex-shrink-0 ml-2">
                          {dest.count} {dest.count === 1 ? 'trip' : 'trips'}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/80 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* One-Way vs. Round-Trip Request Proportion */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>Trip Type Proportion</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Proportion of single-leg vs. return transportation requests
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {requests.length} Requests
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2 space-y-6">
            {/* Visual Comparative Bar */}
            <div
              className="h-4 w-full rounded-full bg-muted flex overflow-hidden"
              role="progressbar"
              aria-label="Trip type distribution progress bar"
            >
              {tripTypes.map((t) => (
                <div
                  key={t.tripType}
                  className={`h-full transition-all ${
                    t.tripType === 'ONE_WAY' ? 'bg-blue-600' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${t.percentage}%` }}
                  title={`${t.label}: ${t.count} (${t.percentage}%)`}
                />
              ))}
            </div>

            {/* Split Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {tripTypes.map((t) => {
                const isOneWay = t.tripType === 'ONE_WAY';
                return (
                  <div
                    key={t.tripType}
                    className="p-4 rounded-lg border border-border bg-muted/20 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-3 w-3 rounded-full ${
                          isOneWay ? 'bg-blue-600' : 'bg-emerald-600'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        {t.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-foreground font-mono">
                        {t.count}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground font-mono">
                        ({t.percentage}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {isOneWay
                        ? 'Direct single journey leg without return dispatch'
                        : 'Coordinated outbound journey with linked return leg'}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Departmental Demand Distribution */}
      <Card className="border-border shadow-xs bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Departmental Transportation Demand</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Request distribution across requesting corporate business units
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {departments.length} Departments
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {departments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No departmental request data recorded.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departments.map((dept) => {
                const pct = Math.round((dept.count / maxDeptCount) * 100);
                return (
                  <div
                    key={dept.department}
                    className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground truncate max-w-[220px]" title={dept.department}>
                        {dept.department}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="font-bold text-foreground">{dept.count}</span>
                        <span className="text-muted-foreground">({dept.percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/75 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
