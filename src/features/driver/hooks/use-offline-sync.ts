'use client';

import * as React from 'react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { offlineSyncService } from '@/services/offline-sync-service';
import { DriverPendingAction, OfflineSyncSummary } from '../types/offline-types';

export function useOfflineSync() {
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const isHydrated = useFleetFlowStore((s) => s.isHydrated);
  const pendingActions = useFleetFlowStore((s) => s.pendingActions);
  const isSimulatedOffline = useFleetFlowStore((s) => s.isSimulatedOffline);
  const setSimulatedOffline = useFleetFlowStore((s) => s.setSimulatedOffline);

  const [isBrowserOnline, setIsBrowserOnline] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
      return window.navigator.onLine !== false;
    }
    return true;
  });

  const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = React.useState<{
    processed: number;
    succeeded: number;
    failed: number;
  } | null>(null);

  // Effective online status combines physical network state and demo simulated state
  const isEffectiveOnline = isBrowserOnline && !isSimulatedOffline;

  // Track browser events
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsBrowserOnline(true);
    };

    const handleOffline = () => {
      setIsBrowserOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filter actions to active driver user
  const userPendingActions = React.useMemo(() => {
    if (!currentUserId) return [];
    return pendingActions.filter((a) => a.actorUserId === currentUserId);
  }, [pendingActions, currentUserId]);

  const syncSummary: OfflineSyncSummary = React.useMemo(() => {
    return {
      totalPending: userPendingActions.filter((a) => a.status === 'PENDING').length,
      totalSyncing: userPendingActions.filter((a) => a.status === 'SYNCING').length,
      totalFailed: userPendingActions.filter((a) => a.status === 'FAILED').length,
      isOnline: isEffectiveOnline,
      isSimulatedOffline,
    };
  }, [userPendingActions, isEffectiveOnline, isSimulatedOffline]);

  // Reconciliation trigger
  const triggerReconciliation = React.useCallback(async () => {
    if (!isEffectiveOnline || !currentUserId || isSyncing) return;

    setIsSyncing(true);
    try {
      const res = await offlineSyncService.reconcilePendingActions(currentUserId);
      if (res.processed > 0) {
        setLastSyncResult({
          processed: res.processed,
          succeeded: res.succeeded,
          failed: res.failed,
        });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isEffectiveOnline, currentUserId, isSyncing]);

  // Automatically attempt reconciliation when network transitions to online
  React.useEffect(() => {
    if (isEffectiveOnline && userPendingActions.some((a) => a.status === 'PENDING')) {
      triggerReconciliation();
    }
  }, [isEffectiveOnline, userPendingActions, triggerReconciliation]);

  const toggleSimulateOffline = React.useCallback(() => {
    setSimulatedOffline(!isSimulatedOffline);
  }, [isSimulatedOffline, setSimulatedOffline]);

  const retryAction = React.useCallback(
    async (actionId: string) => {
      return await offlineSyncService.retryAction(actionId);
    },
    []
  );

  const dismissAction = React.useCallback((actionId: string) => {
    offlineSyncService.dismissAction(actionId);
  }, []);

  return {
    isOnline: isEffectiveOnline,
    isBrowserOnline,
    isSimulatedOffline,
    isSyncing,
    userPendingActions,
    syncSummary,
    lastSyncResult,
    toggleSimulateOffline,
    reconcileNow: triggerReconciliation,
    retryAction,
    dismissAction,
  };
}
