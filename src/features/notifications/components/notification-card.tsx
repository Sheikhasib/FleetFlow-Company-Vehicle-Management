'use client';

import * as React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NotificationViewModel } from '../types/view-models';

export interface NotificationCardProps {
  /** Notification view model containing all presentation fields */
  item: NotificationViewModel;
  /** Callback when user marks an unread notification as read */
  onMarkAsRead?: (id: string) => void;
  /** Callback when user clicks the navigation action for an approved request link */
  onNavigateRequest?: (link: string) => void;
  /** Optional custom class name */
  className?: string;
}

export function NotificationCard({
  item,
  onMarkAsRead,
  onNavigateRequest,
  className,
}: NotificationCardProps) {
  const isUnread = !item.read;

  return (
    <Card
      className={cn(
        'p-4 sm:p-5 transition-all text-card-foreground',
        isUnread
          ? 'bg-card border-border shadow-elevation-1 hover:border-primary/40 border-l-4 border-l-primary'
          : 'bg-muted/10 border-border/70 hover:bg-muted/20 border-l-4 border-l-transparent',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        {/* Content Section */}
        <div className="flex-1 min-w-0">
          {/* Header Row: Dot Indicator, Status Badge & Title */}
          <div className="flex items-start gap-2">
            {isUnread && (
              <span
                className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-1"
                aria-hidden="true"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="sr-only">
                  {isUnread ? 'Unread notification: ' : 'Read notification: '}
                </span>
                <h3
                  className={cn(
                    'text-sm tracking-tight break-words',
                    isUnread
                      ? 'font-semibold text-foreground'
                      : 'font-medium text-foreground/85'
                  )}
                >
                  {item.title}
                </h3>
                {isUnread && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold text-primary border-primary/30 bg-primary/5 px-1.5 py-0"
                  >
                    Unread
                  </Badge>
                )}
              </div>

              {/* Message */}
              <p className="text-sm text-muted-foreground leading-relaxed break-words">
                {item.message}
              </p>

              {/* Timestamps */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs text-muted-foreground">
                <time
                  dateTime={item.createdAt}
                  title={item.displayDateTime}
                  className="font-medium"
                >
                  {item.relativeTime}
                </time>
                {item.displayDateTime && item.displayDateTime !== '—' && (
                  <>
                    <span className="hidden sm:inline" aria-hidden="true">
                      •
                    </span>
                    <time
                      dateTime={item.createdAt}
                      className="hidden sm:inline"
                    >
                      {item.displayDateTime}
                    </time>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        {((isUnread && onMarkAsRead) || (item.hasValidLink && item.link)) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 sm:self-center shrink-0 border-t border-border/40 sm:border-t-0">
            {/* Mark as read button: only rendered when unread */}
            {isUnread && onMarkAsRead && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onMarkAsRead(item.id)}
                className="min-h-[44px] text-xs font-medium"
                aria-label={`Mark notification "${item.title}" as read`}
              >
                <Check className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                Mark as read
              </Button>
            )}

            {/* View request details CTA: only rendered when link is valid */}
            {item.hasValidLink && item.link && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => onNavigateRequest?.(item.link!)}
                className="min-h-[44px] text-xs font-medium"
                aria-label={`View request details for "${item.title}"`}
              >
                View details
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
