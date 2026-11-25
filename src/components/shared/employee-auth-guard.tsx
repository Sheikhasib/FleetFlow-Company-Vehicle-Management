'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2, ArrowRight } from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface EmployeeAuthGuardProps {
  children: React.ReactNode;
}

/**
 * Hydration-safe route guard for all /employee routes.
 * Ensures non-employees see an informative Access Boundary card instead of a redirect loop.
 */
export function EmployeeAuthGuard({ children }: EmployeeAuthGuardProps) {
  const router = useRouter();
  const isHydrated = useFleetFlowStore((s) => s.isHydrated);
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const users = useFleetFlowStore((s) => s.users);
  const setCurrentUser = useFleetFlowStore((s) => s.setCurrentUser);

  const currentUser = users.find((u) => u.id === currentUserId);

  React.useEffect(() => {
    if (isHydrated && !currentUser) {
      router.replace('/login');
    }
  }, [isHydrated, currentUser, router]);

  // While Zustand rehydrates from localStorage, show a clean loading indicator
  if (!isHydrated || !currentUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying employee session...</p>
      </div>
    );
  }

  // Non-employee access boundary (Safe demo card instead of redirect loop)
  if (currentUser.role !== 'EMPLOYEE') {
    return (
      <div className="container max-w-lg mx-auto py-12 px-4">
        <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-amber-700 mb-1">
              <ShieldAlert className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Access Boundary</span>
            </div>
            <CardTitle className="text-xl">Employee Portal Access</CardTitle>
            <CardDescription className="text-amber-900/80">
              You are currently viewing as <strong>{currentUser.name}</strong> with role{' '}
              <span className="inline-block bg-amber-200/80 text-amber-900 font-semibold px-1.5 py-0.5 rounded text-xs">
                {currentUser.role}
              </span>
              . This section contains employee vehicle request tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To test creating vehicle requests and monitoring employee trips, switch to an Employee persona.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={() => {
                  // Switch to default employee persona Nusrat Jahan
                  setCurrentUser('usr_emp_01');
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <span>Switch to Nusrat Jahan (Employee)</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  router.push(`/demo/preview?role=${currentUser.role}`);
                }}
                className="w-full sm:w-auto"
              >
                Go to {currentUser.role} Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is hydrated and authenticated as an EMPLOYEE
  return <>{children}</>;
}
