'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldAlert,
  Car,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
} from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function DemoPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'ADMIN';

  const setCurrentUser = useFleetFlowStore((s) => s.setCurrentUser);
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const users = useFleetFlowStore((s) => s.users);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const isDriver = role === 'DRIVER' || currentUser.role === 'DRIVER';
  const targetPhase = isDriver ? 'Phase 5' : 'Phase 4';
  const portalName = isDriver ? 'Driver Mobile Execution Portal' : 'Admin Operations & Dispatch Dashboard';

  return (
    <div className="container max-w-2xl mx-auto py-16 px-4">
      <Card className="border-border shadow-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <Layers className="h-6 w-6" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              Roadmap Scope Boundary
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {targetPhase}
            </Badge>
          </div>
          <CardTitle className="text-2xl font-bold">{portalName}</CardTitle>
          <CardDescription className="text-sm max-w-md mx-auto pt-1">
            You are logged in as <strong>{currentUser.name}</strong> ({currentUser.role}).
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          <div className="rounded-lg border bg-muted/40 p-4 space-y-3 text-sm">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Implementation Roadmap Status</span>
            </h4>
            <p className="text-muted-foreground text-xs leading-relaxed">
              In accordance with project governance rules, FleetFlow is being built in sequential,
              approved phases. <strong>Phase 3A</strong> covers the complete Employee Vehicle Request experience.
            </p>
            <div className="text-xs space-y-1.5 text-muted-foreground pt-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Phase 1: Project Architecture & Domain Types (Approved)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Phase 2: Zustand Store & Mock Repositories (Approved)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>Phase 3A: Employee Portal & Intake Workflow (Active)</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Phase 4: Admin Dispatch, Approval & Resource Allocation</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Phase 5: Driver Trip Execution & Mileage Tracking</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => {
                setCurrentUser('usr_emp_01');
                router.push('/employee/dashboard');
              }}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <span>Switch to Nusrat Jahan (Employee)</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/login')}
              className="flex-1"
            >
              Back to Login Selection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DemoPreviewPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading demo preview...</p>
        </div>
      }
    >
      <DemoPreviewContent />
    </React.Suspense>
  );
}
