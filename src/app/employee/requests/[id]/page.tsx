'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { RequestDetailCard } from '@/features/vehicle-requests/components/request-detail-card';
import { EmptyState } from '@/components/shared/empty-state';
import { FileQuestion } from 'lucide-react';

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params?.id as string;

  const requests = useFleetFlowStore((s) => s.requests);
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);

  const request = requests.find((r) => r.id === requestId);

  if (!request) {
    return (
      <div className="py-12 pb-20 md:pb-8">
        <EmptyState
          title="Vehicle Request Not Found"
          description={`Could not find any request matching identifier "${requestId}". It may have been deleted or reset.`}
          icon={FileQuestion}
          actionLabel="Return to My Requests"
          onAction={() => router.push('/employee/requests')}
        />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto pb-20 md:pb-8">
      <RequestDetailCard request={request} />
    </div>
  );
}
