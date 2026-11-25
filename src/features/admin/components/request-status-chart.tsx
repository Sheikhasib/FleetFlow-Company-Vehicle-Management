'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PieChart, Clock, CheckCircle2, Car, Navigation, XCircle, AlertTriangle } from 'lucide-react';
import { RequestStatus } from '@/types/domain';

export interface RequestStatusChartProps {
  distribution: Record<RequestStatus, number>;
}

export function RequestStatusChart({ distribution }: RequestStatusChartProps) {
  const total = Object.values(distribution).reduce((acc, curr) => acc + curr, 0);

  const statusConfigs: Array<{
    status: RequestStatus;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    bgClass: string;
    textClass: string;
  }> = [
    {
      status: 'PENDING',
      label: 'Pending Review',
      icon: Clock,
      colorClass: 'bg-amber-500',
      bgClass: 'bg-amber-100',
      textClass: 'text-amber-800',
    },
    {
      status: 'APPROVED',
      label: 'Approved (Awaiting Dispatch)',
      icon: CheckCircle2,
      colorClass: 'bg-blue-500',
      bgClass: 'bg-blue-100',
      textClass: 'text-blue-800',
    },
    {
      status: 'ASSIGNED',
      label: 'Assigned (Dispatched)',
      icon: Car,
      colorClass: 'bg-indigo-500',
      bgClass: 'bg-indigo-100',
      textClass: 'text-indigo-800',
    },
    {
      status: 'COMPLETED',
      label: 'Completed',
      icon: CheckCircle2,
      colorClass: 'bg-emerald-500',
      bgClass: 'bg-emerald-100',
      textClass: 'text-emerald-800',
    },
    {
      status: 'REJECTED',
      label: 'Rejected',
      icon: AlertTriangle,
      colorClass: 'bg-red-500',
      bgClass: 'bg-red-100',
      textClass: 'text-red-800',
    },
    {
      status: 'CANCELLED',
      label: 'Cancelled',
      icon: XCircle,
      colorClass: 'bg-slate-500',
      bgClass: 'bg-slate-100',
      textClass: 'text-slate-700',
    },
  ];

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Request Lifecycle Distribution</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of all requests by their current operational state
            </CardDescription>
          </div>
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {total} Total
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Visual Multi-Segment Bar */}
        <div
          className="h-3 w-full rounded-full bg-muted flex overflow-hidden mb-6"
          role="progressbar"
          aria-valuenow={total}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Request status proportion bar"
        >
          {statusConfigs.map(({ status, colorClass }) => {
            const count = distribution[status] || 0;
            if (count === 0 || total === 0) return null;
            const widthPct = (count / total) * 100;
            return (
              <div
                key={status}
                className={`${colorClass} transition-all`}
                style={{ width: `${widthPct}%` }}
                title={`${status}: ${count} (${Math.round(widthPct)}%)`}
              />
            );
          })}
        </div>

        {/* Detailed Breakdown List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {statusConfigs.map(({ status, label, icon: Icon, colorClass, bgClass, textClass }) => {
            const count = distribution[status] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div
                key={status}
                className="flex items-center justify-between p-2 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${colorClass}`} aria-hidden="true" />
                  <span className="text-xs font-medium text-foreground truncate">
                    {label}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {count}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono w-8 text-right">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
