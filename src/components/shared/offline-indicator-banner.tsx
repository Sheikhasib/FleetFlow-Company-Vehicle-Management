'use client';

import * as React from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOfflineSync } from '@/features/driver/hooks/use-offline-sync';
import { DriverOfflineQueueModal } from '@/features/driver/components/driver-offline-queue-modal';

export function OfflineIndicatorBanner() {
  const {
    isOnline,
    isSimulatedOffline,
    isSyncing,
    syncSummary,
    toggleSimulateOffline,
    reconcileNow,
  } = useOfflineSync();

  const [isQueueModalOpen, setIsQueueModalOpen] = React.useState<boolean>(false);

  // If online, not syncing, and no pending or failed actions, render minimal header indicator
  const hasPending = syncSummary.totalPending > 0;
  const hasFailed = syncSummary.totalFailed > 0;

  return (
    <>
      {/* Top Banner (Visible when offline, syncing, or has failed actions) */}
      {(!isOnline || isSyncing || hasPending || hasFailed) && (
        <aside
          aria-label="Network Connectivity and Synchronization Status"
          className={`border-b transition-colors px-4 py-2 sm:px-6 text-xs font-medium flex items-center justify-between flex-wrap gap-2 ${
            !isOnline
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200'
              : hasFailed
              ? 'bg-destructive/15 border-destructive/30 text-destructive'
              : isSyncing
              ? 'bg-blue-500/15 border-blue-500/30 text-blue-900 dark:text-blue-200'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {!isOnline ? (
              <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            ) : hasFailed ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            ) : isSyncing ? (
              <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-blue-600 dark:text-blue-400" aria-hidden="true" />
            ) : (
              <Wifi className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            )}

            <span>
              {!isOnline
                ? 'Working in Offline Mode. Trip manifests and passenger contacts remain accessible. Actions will queue locally.'
                : hasFailed
                ? `${syncSummary.totalFailed} queued action failed synchronization with dispatch.`
                : isSyncing
                ? 'Synchronizing queued trip actions with corporate dispatch...'
                : `${syncSummary.totalPending} action queued awaiting network dispatch.`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(hasPending || hasFailed) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsQueueModalOpen(true)}
                className="h-7 text-[11px] gap-1 px-2 border-current bg-transparent hover:bg-current/10"
              >
                <Layers className="h-3 w-3" />
                <span>Queue ({syncSummary.totalPending + syncSummary.totalFailed})</span>
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}

            {isOnline && hasPending && !isSyncing && (
              <Button
                variant="outline"
                size="sm"
                onClick={reconcileNow}
                className="h-7 text-[11px] gap-1 px-2 border-current bg-transparent hover:bg-current/10"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Sync Now</span>
              </Button>
            )}

            {/* Evaluator Simulated Offline Mode Switch */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSimulateOffline}
              title={isSimulatedOffline ? 'Resume Normal Online Mode' : 'Simulate Offline Disconnection for Demo'}
              className="h-7 text-[10px] px-2 text-muted-foreground hover:text-foreground underline decoration-dotted"
            >
              {isSimulatedOffline ? 'Exit Demo Offline' : 'Demo: Simulate Offline'}
            </Button>
          </div>
        </aside>
      )}

      {/* Queue Details Modal */}
      <DriverOfflineQueueModal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
      />
    </>
  );
}
