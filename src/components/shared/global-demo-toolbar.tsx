'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { RotateCcw, User, ShieldCheck, CheckCircle2, Check, ChevronDown } from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export function GlobalDemoToolbar() {
  const router = useRouter();
  const pathname = usePathname();

  const isHydrated = useFleetFlowStore((s) => s.isHydrated);
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const users = useFleetFlowStore((s) => s.users);
  const setCurrentUser = useFleetFlowStore((s) => s.setCurrentUser);
  const resetData = useFleetFlowStore((s) => s.resetData);

  const [resetDialogOpen, setResetDialogOpen] = React.useState(false);
  const [resetFeedback, setResetFeedback] = React.useState(false);
  const [personaModalOpen, setPersonaModalOpen] = React.useState(false);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const selectUser = (newUserId: string) => {
    setCurrentUser(newUserId);
    setPersonaModalOpen(false);
    const selectedUser = users.find((u) => u.id === newUserId);
    if (!selectedUser) return;

    if (selectedUser.role === 'EMPLOYEE') {
      if (!pathname.startsWith('/employee')) {
        router.push('/employee/dashboard');
      }
    } else if (selectedUser.role === 'ADMIN') {
      if (!pathname.startsWith('/admin')) {
        router.push('/admin/dashboard');
      }
    } else {
      router.push(`/demo/preview?role=${selectedUser.role}`);
    }
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    selectUser(e.target.value);
  };

  const handleConfirmReset = () => {
    resetData();
    setResetDialogOpen(false);
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 3000);
  };

  if (!isHydrated) {
    return (
      <aside
        aria-label="Demo environment loading"
        className="w-full bg-slate-900 text-slate-100 h-7 md:h-9 border-b border-slate-800 flex items-center z-50 sticky top-0"
      >
        <div className="w-full h-full container max-w-full md:max-w-4xl lg:max-w-6xl mx-auto px-4 sm:px-6 md:px-6 lg:px-8 flex items-center justify-between">
          <span className="text-slate-400 text-[11px] md:text-xs">
            Loading FleetFlow Demo Environment...
          </span>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside
        aria-label="Demo environment control toolbar"
        className="w-full bg-slate-900 text-slate-100 h-7 md:h-9 border-b border-slate-800 flex items-center z-50 sticky top-0 select-none"
      >
        {/* ============================================================== */}
        {/* DESKTOP & TABLET TOOLBAR (md:flex, height 36px / h-9)           */}
        {/* Aligned with max-w-6xl application container                   */}
        {/* ============================================================== */}
        <div className="hidden md:flex items-center justify-between w-full h-full container max-w-full md:max-w-4xl lg:max-w-6xl mx-auto px-4 sm:px-6 md:px-6 lg:px-8">
          {/* Left: Brand / Demo Status */}
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold tracking-wide uppercase text-[10px] text-slate-200">
              FleetFlow Demo
            </span>
            <span className="text-slate-600">|</span>
            <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              Phase 3A Interactive
            </span>
          </div>

          {/* Right: Persona Switcher & Reset Action */}
          <div className="flex items-center gap-3">
            {resetFeedback && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                <CheckCircle2 className="h-3 w-3" />
                Demo Data Reset
              </span>
            )}

            {/* Persona Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded border border-slate-700">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <label htmlFor="desktop-persona-select" className="sr-only">
                Switch Persona
              </label>
              <select
                id="desktop-persona-select"
                value={currentUserId}
                onChange={handleUserChange}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-1"
              >
                <optgroup label="Employees (Phase 3A Available)">
                  {users
                    .filter((u) => u.role === 'EMPLOYEE')
                    .map((u) => (
                      <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100">
                        {u.name} ({u.department || 'Employee'})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Admin (Phase 4 Preview)">
                  {users
                    .filter((u) => u.role === 'ADMIN')
                    .map((u) => (
                      <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100">
                        {u.name} (Admin)
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Driver (Phase 5 Preview)">
                  {users
                    .filter((u) => u.role === 'DRIVER')
                    .map((u) => (
                      <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100">
                        {u.name} (Driver)
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Reset Demo Data Button */}
            <button
              onClick={() => setResetDialogOpen(true)}
              title="Reset demo data to initial state"
              className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] text-slate-200 border border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RotateCcw className="h-3 w-3 text-slate-400" />
              <span>Reset Demo</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MOBILE TOOLBAR (< md, compact micro-strip height 28px / h-7)    */}
        {/* ============================================================== */}
        <div className="flex md:hidden items-center justify-between w-full h-full px-3 sm:px-4">
          {/* Left: Persona Avatar Dot + Truncated Name Pill */}
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <button
              onClick={() => setPersonaModalOpen(true)}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-200 hover:text-white transition-colors py-0.5 px-2 rounded bg-slate-800/90 border border-slate-700/80 max-w-[210px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="Tap to switch persona"
              aria-label={`Current Persona: ${currentUser.name}. Tap to switch persona.`}
            >
              <User className="h-3 w-3 text-slate-400 flex-shrink-0" />
              <span className="truncate">{currentUser.name}</span>
              <span className="text-[9px] uppercase px-1 py-0.2 bg-slate-700 text-slate-300 rounded font-semibold flex-shrink-0 ml-0.5">
                {currentUser.role === 'EMPLOYEE' ? 'EMP' : currentUser.role === 'ADMIN' ? 'ADM' : 'DRV'}
              </span>
              <ChevronDown className="h-2.5 w-2.5 text-slate-400 flex-shrink-0" />
            </button>
          </div>

          {/* Right: Discreet Reset Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {resetFeedback && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                <CheckCircle2 className="h-3 w-3" />
                <span className="hidden xs:inline">Reset</span>
              </span>
            )}

            <button
              onClick={() => setResetDialogOpen(true)}
              title="Reset demo data to initial state"
              aria-label="Reset demo data"
              className="relative p-1 text-slate-400 hover:text-slate-200 transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring after:absolute after:inset-[-8px] after:content-['']"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MOBILE PERSONA SWITCHER DIALOG                                 */}
      {/* ============================================================== */}
      <Dialog open={personaModalOpen} onOpenChange={setPersonaModalOpen}>
        <DialogContent onClose={() => setPersonaModalOpen(false)} className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Switch Demo Persona</DialogTitle>
            <DialogDescription>
              Select an account to preview role-specific features and permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 py-1">
            {/* Employees */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1.5">
                Employees (Phase 3A Available)
              </div>
              <div className="space-y-1">
                {users
                  .filter((u) => u.role === 'EMPLOYEE')
                  .map((u) => {
                    const isSelected = u.id === currentUserId;
                    return (
                      <button
                        key={u.id}
                        onClick={() => selectUser(u.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors min-h-[44px] ${
                          isSelected
                            ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div>
                          <div className="font-medium leading-none">{u.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {u.department || 'Employee'} • {u.email}
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Admin */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1.5 pt-2 border-t">
                Admin (Phase 4 Preview)
              </div>
              <div className="space-y-1">
                {users
                  .filter((u) => u.role === 'ADMIN')
                  .map((u) => {
                    const isSelected = u.id === currentUserId;
                    return (
                      <button
                        key={u.id}
                        onClick={() => selectUser(u.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors min-h-[44px] ${
                          isSelected
                            ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div>
                          <div className="font-medium leading-none">{u.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Fleet Administrator • {u.email}
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Driver */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1.5 pt-2 border-t">
                Driver (Phase 5 Preview)
              </div>
              <div className="space-y-1">
                {users
                  .filter((u) => u.role === 'DRIVER')
                  .map((u) => {
                    const isSelected = u.id === currentUserId;
                    return (
                      <button
                        key={u.id}
                        onClick={() => selectUser(u.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors min-h-[44px] ${
                          isSelected
                            ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div>
                          <div className="font-medium leading-none">{u.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Assigned Driver • {u.email}
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* RESET CONFIRMATION DIALOG                                      */}
      {/* ============================================================== */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent onClose={() => setResetDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Reset Demo Data?</DialogTitle>
            <DialogDescription>
              This will restore all vehicle requests, trip legs, and resource assignments back to
              pristine seed data. Any newly created vehicle requests will be discarded.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
            This affects in-browser Zustand store persistence only. No external services or files
            are modified.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmReset}>
              Confirm Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
