'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Car } from 'lucide-react';
import { RequestCreationForm } from '@/features/vehicle-requests/components/request-creation-form';
import { Button } from '@/components/ui/button';

export default function NewRequestPage() {
  return (
    <div className="container max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb / Back button */}
      <div>
        <Link
          href="/employee/requests"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to My Requests</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Create Vehicle Request
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit a company transportation request for business travel between enterprise facilities.
        </p>
      </div>

      {/* Form */}
      <RequestCreationForm />
    </div>
  );
}
