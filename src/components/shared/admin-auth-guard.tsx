'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { UserRole } from '@/types/domain';

export interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export function getAdminGuardFallbackTarget(role?: UserRole): {
  label: string;
  href: string;
} {
  if (role === 'EMPLOYEE') {
    return { label: 'Employee', href: '/employee/dashboard' };
  }
  if (role === 'DRIVER') {
    return { label: 'Driver', href: '/driver/dashboard' };
  }
  return { label: 'Login', href: '/login' };
}

/**
 * Route protection guard for the Administrator Portal.
 * Enforces that only active ADMIN personas can access /admin routes.
 * Provides a seamless one-click switch to default admin persona Mohammad Arif Hasan (usr_adm_01)
 * if accessed while in EMPLOYEE or DRIVER role.
 */
export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter();
  const isHydrated = useFleetFlowStore((s) => s.isHydrated);
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const users = useFleetFlowStore((s) => s.users);
  const setCurrentUser = useFleetFlowStore((s) => s.setCurrentUser);

  const currentUser = users.find((u) => u.id === currentUserId);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  // Role Gate: If not authenticated as an ADMIN
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
        <Card className="max-w-md w-full border-border shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-2">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold">Administrator Role Required</CardTitle>
            <CardDescription className="text-xs">
              You are currently logged in as <strong>{currentUser?.name || 'Unknown'}</strong> ({currentUser?.role || 'Guest'}).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              The Admin Operations & Dispatch Portal requires an Administrator persona to review requests, manage vehicle dispatch, and monitor fleet logistics.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={() => {
                  // Switch to default admin persona Mohammad Arif Hasan
                  setCurrentUser('usr_adm_01');
                }}
                className="w-full sm:flex-1 flex items-center justify-center gap-2"
              >
                <span>Switch to Admin (Arif Hasan)</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              {(() => {
                const fallback = getAdminGuardFallbackTarget(currentUser?.role);
                return (
                  <Button
                    variant="outline"
                    onClick={() => router.push(fallback.href)}
                    className="w-full sm:w-auto"
                  >
                    Return to {fallback.label}
                  </Button>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
