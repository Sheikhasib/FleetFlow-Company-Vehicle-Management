import React from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';

/**
 * Minimal Global Demo Toolbar Placeholder (Phase 1/2 Foundation)
 * Full interactive switching and session management will be implemented in Phase 3.
 */
export function DemoToolbarPlaceholder() {
  return (
    <aside
      aria-label="Demo environment notification"
      className="w-full bg-slate-900 text-slate-100 text-xs px-4 py-2 border-b border-slate-800 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold tracking-wide uppercase text-[10px] text-slate-300">
          FleetFlow Demo Mode
        </span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-300 flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
          Prototype Architecture Verified (Phases 1 & 2)
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-slate-400 hidden sm:inline">
          Single Source of Truth: <strong className="text-slate-200">Zustand + Persist</strong>
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 border border-slate-700">
          <RefreshCw className="h-3 w-3 text-slate-400" />
          Reset Ready
        </span>
      </div>
    </aside>
  );
}
