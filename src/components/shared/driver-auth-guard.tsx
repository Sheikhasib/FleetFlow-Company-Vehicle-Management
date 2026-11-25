'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface DriverAuthGuardProps {
  children: React.ReactNode;
}

/**
 * Route protection guard for the Driver Mobile Portal (/driver).
 * Enforces that only active DRIVER personas with a valid Driver entity record can access /driver routes.
 * Provides safe, actionable fallback cards with 1-click persona switching to Abdul Karim (usr_drv_01).
 */
export function DriverAuthGuard({ children }: DriverAuthGuardProps) {
  const router = useRouter();
  const isHydrated = useFleetFlowStore((s) => s.isHydrated);
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const users = useFleetFlowStore((s) => s.users);
  const drivers = useFleetFlowStore((s) => s.drivers);
  const setCurrentUser = useFleetFlowStore((s) => s.setCurrentUser);

  const currentUser = users.find((u) => u.id === currentUserId);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading driver session...</p>
        </div>
      </div>
    );
  }

  // Role Gate: Must have role DRIVER
  if (!currentUser || currentUser.role !== 'DRIVER') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
        <Card className="max-w-md w-full border-border shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-2">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold">Driver Access Required</CardTitle>
            <CardDescription className="text-xs">
              You are currently logged in as <strong>{currentUser?.name || 'Unknown'}</strong> ({currentUser?.role || 'Guest'}).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              The Driver Mobile Portal requires a Fleet Driver persona to review trip manifests, confirm passenger pickups, and record journey milestones.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={() => {
                  setCurrentUser('usr_drv_01');
                }}
                className="w-full sm:flex-1 flex items-center justify-center gap-2"
              >
                <span>Switch to Driver (Abdul Karim)</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (currentUser?.role === 'ADMIN') {
                    router.push('/admin/dashboard');
                  } else if (currentUser?.role === 'EMPLOYEE') {
                    router.push('/employee/dashboard');
                  } else {
                    router.push('/login');
                  }
                }}
                className="w-full sm:w-auto"
              >
                Return to {currentUser?.role === 'ADMIN' ? 'Admin' : currentUser?.role === 'EMPLOYEE' ? 'Employee' : 'Login'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Identity Validation: Resolve Driver profile (Driver.userId === currentUser.id)
  const driverProfile = drivers.find((d) => d.userId === currentUser.id);
  if (!driverProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
        <Card className="max-w-md w-full border-border shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-2">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold">Driver Profile Missing</CardTitle>
            <CardDescription className="text-xs">
              Account <strong>{currentUser.name}</strong> ({currentUser.id}) has role DRIVER, but no matching Driver operational record exists in the fleet database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Please select a valid registered driver persona to access the Driver Portal.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={() => {
                  setCurrentUser('usr_drv_01');
                }}
                className="w-full sm:flex-1 flex items-center justify-center gap-2"
              >
                <span>Switch to Abdul Karim</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/login')}
                className="w-full sm:w-auto"
              >
                Return to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
