'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { RequestTable } from '@/features/vehicle-requests/components/request-table';
import { Button } from '@/components/ui/button';

export default function EmployeeRequestsPage() {
  const router = useRouter();
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const users = useFleetFlowStore((s) => s.users);
  const requests = useFleetFlowStore((s) => s.requests);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  // Filter requests submitted by the active employee
  const userRequests = React.useMemo(() => {
    return requests.filter((r) => r.requesterId === currentUser.id);
  }, [requests, currentUser.id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            My Vehicle Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Search, filter, and track all transportation requests submitted from your account.
          </p>
        </div>
        <Button
          onClick={() => router.push('/employee/requests/new')}
          className="flex items-center gap-2 shadow-sm self-start sm:self-center"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Vehicle Request</span>
        </Button>
      </div>

      {/* Request Table with Search & Status Filter */}
      <RequestTable requests={userRequests} />
    </div>
  );
}
