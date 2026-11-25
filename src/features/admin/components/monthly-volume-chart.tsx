'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BarChart2 } from 'lucide-react';
import { MonthlyVolumeItem } from '@/services/analytics-service';

export interface MonthlyVolumeChartProps {
  data: MonthlyVolumeItem[];
}

export function MonthlyVolumeChart({ data }: MonthlyVolumeChartProps) {
  const maxCount = Math.max(...data.map((d) => d.requestCount), 1);

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Monthly Request Volume</span>
            </CardTitle>
            <CardDescription className="text-xs">
              {data.length <= 1
                ? 'Transportation request volume for the current demo period (single calendar month in demo seed)'
                : 'Transportation request volume trends across recent calendar months'}
            </CardDescription>
          </div>
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {data.reduce((acc, curr) => acc + curr.requestCount, 0)} Total
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
            No historical volume data available.
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="h-48 w-full flex items-end gap-3 sm:gap-6 pt-6 pb-2 px-2 border-b border-border"
              role="img"
              aria-label="Monthly request volume bar chart"
            >
              {data.map((item) => {
                const heightPercent = Math.max(Math.round((item.requestCount / maxCount) * 100), 8);
                return (
                  <div
                    key={item.month}
                    className="flex-1 flex flex-col items-center h-full justify-end group"
                  >
                    <div className="text-[11px] font-mono font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                      {item.requestCount}
                    </div>
                    <div
                      className="w-full max-w-[48px] bg-primary/85 group-hover:bg-primary transition-all rounded-t-md relative"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <span className="sr-only">
                        {item.month}: {item.requestCount} requests
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* X-axis labels */}
            <div className="flex items-center justify-between px-2 text-xs text-muted-foreground font-medium">
              {data.map((item) => (
                <div key={item.month} className="flex-1 text-center truncate">
                  {item.month}
                </div>
              ))}
            </div>
            {data.length === 1 && (
              <p className="text-[11px] text-muted-foreground text-center pt-1 italic">
                Note: Demo seed data encompasses requests within a single active calendar month. Historical trend bars will expand as multi-month operational data accumulates.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
