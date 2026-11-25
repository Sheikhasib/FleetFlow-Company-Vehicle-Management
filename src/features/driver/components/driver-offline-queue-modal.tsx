'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useOfflineSync } from '@/features/driver/hooks/use-offline-sync';
import { formatDisplayDateTime } from '@/lib/utils/date';
import { TRIP_LIFECYCLE_MILESTONES } from '@/features/vehicle-requests/types/view-models';

interface DriverOfflineQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DriverOfflineQueueModal({ isOpen, onClose }: DriverOfflineQueueModalProps) {
  const {
    isOnline,
    isSyncing,
    userPendingActions,
    reconcileNow,
    retryAction,
    dismissAction,
  } = useOfflineSync();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
              <span>Offline Action Queue</span>
            </DialogTitle>
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold gap-1 ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3 text-emerald-600" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-amber-600" />
                  <span>Offline</span>
                </>
              )}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Trip lifecycle milestones queued while disconnected. Actions are reconciled automatically in strict sequential order once connectivity is restored.
          </DialogDescription>
        </DialogHeader>

        {/* Action Queue List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2.5 pr-1">
          {userPendingActions.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <p className="text-sm font-semibold text-foreground">Queue is Empty</p>
              <p className="text-xs text-muted-foreground">
                All driver milestone actions have been fully synchronized with corporate dispatch.
              </p>
            </div>
          ) : (
            userPendingActions.map((action, index) => {
              const targetMilestone = TRIP_LIFECYCLE_MILESTONES[action.targetStatus];

              return (
                <div
                  key={action.id}
                  className={`p-3 rounded-lg border text-xs space-y-2 ${
                    action.status === 'FAILED'
                      ? 'bg-destructive/5 border-destructive/30'
                      : action.status === 'SYNCING'
                      ? 'bg-blue-50/50 border-blue-200'
                      : 'bg-muted/40 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                        {index + 1}
                      </span>
                      <span>{targetMilestone?.label || action.actionType}</span>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase font-bold px-1.5 py-0 ${
                        action.status === 'FAILED'
                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                          : action.status === 'SYNCING'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {action.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                    <div>
                      <span>Trip Leg: </span>
                      <code className="font-mono font-medium text-foreground">{action.tripLegId}</code>
                    </div>
                    <div className="text-right">
                      <span>Queued: </span>
                      <span className="font-medium text-foreground">
                        {formatDisplayDateTime(action.queuedAt)}
                      </span>
                    </div>
                  </div>

                  {action.errorMessage && (
                    <div className="p-2 rounded bg-destructive/10 text-destructive text-[11px] flex items-start gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{action.errorMessage}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    {action.status === 'FAILED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryAction(action.id)}
                        className="h-6 text-[10px] gap-1 px-2"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Retry</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAction(action.id)}
                      className="h-6 text-[10px] gap-1 px-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Dismiss</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>

          {isOnline && userPendingActions.some((a) => a.status === 'PENDING') && (
            <Button
              size="sm"
              onClick={reconcileNow}
              disabled={isSyncing}
              className="w-full sm:w-auto gap-1.5"
            >
              {isSyncing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span>Sync All Pending</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
