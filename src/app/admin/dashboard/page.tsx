'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Clock,
  Navigation,
  CheckCircle2,
  Car,
  UserCheck,
  PlusCircle,
  TrendingUp,
} from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { isActiveTripStatus } from '@/lib/constants/domain';
import { KpiMetricCard } from '@/features/admin/components/kpi-metric-card';
import { MonthlyVolumeChart } from '@/features/admin/components/monthly-volume-chart';
import { RequestStatusChart } from '@/features/admin/components/request-status-chart';
import {
  DashboardPendingRequestsCard,
  DashboardActiveTripsCard,
  DashboardRecentActivityCard,
} from '@/features/admin/components/dashboard-quick-tables';
import { RequestStatus } from '@/types/domain';

export default function AdminDashboardPage() {
  const requests = useFleetFlowStore((s) => s.requests);
  const tripLegs = useFleetFlowStore((s) => s.tripLegs);
  const vehicles = useFleetFlowStore((s) => s.vehicles);
  const drivers = useFleetFlowStore((s) => s.drivers);
  const users = useFleetFlowStore((s) => s.users);
  const activityLogs = useFleetFlowStore((s) => s.activityLogs);

  // Derived KPI metrics
  const totalRequests = requests.length;
  const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;
  const activeTrips = tripLegs.filter((l) => isActiveTripStatus(l.status)).length;
  const completedTrips = requests.filter((r) => r.status === 'COMPLETED').length;
  const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE').length;

  // Monthly volume calculation
  const monthlyVolume = React.useMemo(() => {
    const monthMap: Record<string, number> = {};
    requests.forEach((r) => {
      const date = new Date(r.createdAt);
      if (!isNaN(date.getTime())) {
        const key = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        monthMap[key] = (monthMap[key] || 0) + 1;
      }
    });
    return Object.entries(monthMap).map(([month, requestCount]) => ({
      month,
      requestCount,
    }));
  }, [requests]);

  // Request status distribution
  const statusDistribution = React.useMemo(() => {
    const dist: Record<RequestStatus, number> = {
      PENDING: 0,
      APPROVED: 0,
      ASSIGNED: 0,
      COMPLETED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    requests.forEach((r) => {
      dist[r.status] = (dist[r.status] || 0) + 1;
    });
    return dist;
  }, [requests]);

  return (
    <div className="container max-w-full md:max-w-6xl lg:max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 md:px-6 lg:px-8 space-y-6 sm:space-y-8">
      {/* Page Title & Operational Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Operations & Dispatch Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centralized corporate transportation coordination, approval queues, and live fleet monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/assignments"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-colors"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Dispatch Center</span>
          </Link>
          <Link
            href="/admin/trips"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border border-border bg-card text-foreground hover:bg-muted shadow-xs transition-colors"
          >
            <Navigation className="h-3.5 w-3.5 text-primary" />
            <span>Live Monitor</span>
          </Link>
        </div>
      </div>

      {/* 1. Core Operational KPI Cards (5 Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <KpiMetricCard
          title="Total Requests"
          value={totalRequests}
          description="All corporate submissions"
          icon={FileSpreadsheet}
          accentColor="slate"
          href="/admin/requests"
        />
        <KpiMetricCard
          title="Pending Review"
          value={pendingRequests}
          description="Awaiting approval"
          icon={Clock}
          accentColor="amber"
          badgeText={pendingRequests > 0 ? "Action Needed" : "Queue Clear"}
          href="/admin/requests?status=PENDING"
        />
        <KpiMetricCard
          title="Active Trips"
          value={activeTrips}
          description="En route or staging"
          icon={Navigation}
          accentColor="violet"
          href="/admin/trips"
        />
        <KpiMetricCard
          title="Completed Trips"
          value={completedTrips}
          description="Concluded journeys"
          icon={CheckCircle2}
          accentColor="emerald"
          href="/admin/requests?status=COMPLETED"
        />
        <KpiMetricCard
          title="Available Fleet"
          value={`${availableVehicles}/${vehicles.length}`}
          description="Ready for assignment"
          icon={Car}
          accentColor="blue"
          href="/admin/vehicles"
        />
      </div>

      {/* 2. Charts Section: Monthly Volume Trend & Lifecycle Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <MonthlyVolumeChart data={monthlyVolume} />
        <RequestStatusChart distribution={statusDistribution} />
      </div>

      {/* 3. Operational Quick Queues (Pending Requests, Active Trips, Recent Audit Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <DashboardPendingRequestsCard
          requests={requests}
          users={users}
          tripLegs={tripLegs}
        />
        <DashboardActiveTripsCard
          tripLegs={tripLegs}
          requests={requests}
          vehicles={vehicles}
          drivers={drivers}
          users={users}
        />
      </div>

      {/* 4. Recent Audit History */}
      <div>
        <DashboardRecentActivityCard
          activityLogs={activityLogs}
          users={users}
        />
      </div>
    </div>
  );
}
