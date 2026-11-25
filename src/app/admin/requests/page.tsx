'use client';

import * as React from 'react';
import Link from 'next/link';
import { ClipboardList, ArrowLeft } from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { AdminRequestTable } from '@/features/admin/components/admin-request-table';

export default function AdminRequestsQueuePage() {
  const requests = useFleetFlowStore((s) => s.requests);
  const users = useFleetFlowStore((s) => s.users);
  const tripLegs = useFleetFlowStore((s) => s.tripLegs);

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
            <ClipboardList className="h-6 w-6 text-primary" aria-hidden="true" />
            <span>Request Management Queue</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, evaluate, and prioritize organization-wide employee transportation requests.
          </p>
        </div>
      </div>

      {/* Main Request Queue Table */}
      <AdminRequestTable requests={requests} users={users} tripLegs={tripLegs} />
    </div>
  );
}
