'use client';

import * as React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface KpiMetricCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: LucideIcon;
  badgeText?: string;
  accentColor?: 'slate' | 'amber' | 'blue' | 'violet' | 'emerald';
  href?: string;
}

export function KpiMetricCard({
  title,
  value,
  description,
  icon: Icon,
  badgeText,
  accentColor = 'slate',
  href,
}: KpiMetricCardProps) {
  const colorStyles = {
    slate: {
      iconBg: 'bg-slate-100 text-slate-800',
      border: 'hover:border-slate-300',
      valueColor: 'text-foreground',
    },
    amber: {
      iconBg: 'bg-amber-100 text-amber-800',
      border: 'hover:border-amber-300',
      valueColor: 'text-amber-900',
    },
    blue: {
      iconBg: 'bg-blue-100 text-blue-800',
      border: 'hover:border-blue-300',
      valueColor: 'text-blue-900',
    },
    violet: {
      iconBg: 'bg-violet-100 text-violet-800',
      border: 'hover:border-violet-300',
      valueColor: 'text-violet-900',
    },
    emerald: {
      iconBg: 'bg-emerald-100 text-emerald-800',
      border: 'hover:border-emerald-300',
      valueColor: 'text-emerald-900',
    },
  }[accentColor];

  const cardContent = (
    <Card className={`border-border bg-card shadow-xs transition-all ${colorStyles.border} ${href ? 'cursor-pointer hover:shadow-sm' : ''}`}>
      <CardContent className="p-4 sm:p-5 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${colorStyles.valueColor}`}>
              {value}
            </span>
            {badgeText && (
              <span className="text-[11px] font-medium text-muted-foreground">
                {badgeText}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground pt-0.5 line-clamp-1">
              {description}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg flex-shrink-0 ${colorStyles.iconBg}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg block">{cardContent}</Link>;
  }

  return cardContent;
}
