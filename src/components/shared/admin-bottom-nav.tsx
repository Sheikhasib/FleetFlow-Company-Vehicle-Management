'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  UserCheck,
  Navigation,
  MoreHorizontal,
  Car,
  Users,
  BarChart3,
  X,
} from 'lucide-react';

export function AdminBottomNav() {
  const pathname = usePathname();
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);

  const isDashboardActive = pathname === '/admin/dashboard';
  const isRequestsActive =
    pathname === '/admin/requests' || pathname.startsWith('/admin/requests/');
  const isAssignmentsActive = pathname === '/admin/assignments';
  const isTripsActive = pathname === '/admin/trips';
  const isVehiclesActive = pathname === '/admin/vehicles';
  const isDriversActive = pathname === '/admin/drivers';
  const isAnalyticsActive = pathname === '/admin/analytics';
  const isMoreActive = isVehiclesActive || isDriversActive || isAnalyticsActive;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {moreMenuOpen && (
        <div
          role="presentation"
          onClick={() => setMoreMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Mobile "More" Drawer Panel */}
      {moreMenuOpen && (
        <div
          role="dialog"
          aria-label="More Operations Navigation"
          className="fixed bottom-16 left-0 right-0 z-50 bg-card border-t border-border p-4 shadow-xl md:hidden animate-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Fleet & Reporting Directories
            </span>
            <button
              onClick={() => setMoreMenuOpen(false)}
              className="p-1 text-muted-foreground hover:text-foreground rounded-md"
              aria-label="Close More Menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/admin/vehicles"
              onClick={() => setMoreMenuOpen(false)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-colors ${
                isVehiclesActive
                  ? 'bg-primary/10 border-primary text-primary font-semibold'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Car className="h-5 w-5 mb-1" />
              <span className="text-xs">Vehicles</span>
            </Link>

            <Link
              href="/admin/drivers"
              onClick={() => setMoreMenuOpen(false)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-colors ${
                isDriversActive
                  ? 'bg-primary/10 border-primary text-primary font-semibold'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Users className="h-5 w-5 mb-1" />
              <span className="text-xs">Drivers</span>
            </Link>

            <Link
              href="/admin/analytics"
              onClick={() => setMoreMenuOpen(false)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-colors ${
                isAnalyticsActive
                  ? 'bg-primary/10 border-primary text-primary font-semibold'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <BarChart3 className="h-5 w-5 mb-1" />
              <span className="text-xs">Analytics</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav
        aria-label="Admin Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border shadow-lg h-16 pb-[env(safe-area-inset-bottom)] px-3 flex items-center justify-between"
      >
        {/* 1. Dashboard */}
        <Link
          href="/admin/dashboard"
          aria-current={isDashboardActive ? 'page' : undefined}
          className={`relative flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isDashboardActive
              ? 'text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] leading-tight mt-1">Dashboard</span>
          {isDashboardActive && (
            <span className="absolute bottom-0.5 h-0.5 w-6 bg-primary rounded-full" />
          )}
        </Link>

        {/* 2. Requests */}
        <Link
          href="/admin/requests"
          aria-current={isRequestsActive ? 'page' : undefined}
          className={`relative flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isRequestsActive
              ? 'text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] leading-tight mt-1">Requests</span>
          {isRequestsActive && (
            <span className="absolute bottom-0.5 h-0.5 w-6 bg-primary rounded-full" />
          )}
        </Link>

        {/* 3. Assignments */}
        <Link
          href="/admin/assignments"
          aria-current={isAssignmentsActive ? 'page' : undefined}
          className={`relative flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isAssignmentsActive
              ? 'text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserCheck className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] leading-tight mt-1">Assign</span>
          {isAssignmentsActive && (
            <span className="absolute bottom-0.5 h-0.5 w-6 bg-primary rounded-full" />
          )}
        </Link>

        {/* 4. Trips */}
        <Link
          href="/admin/trips"
          aria-current={isTripsActive ? 'page' : undefined}
          className={`relative flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isTripsActive
              ? 'text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Navigation className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] leading-tight mt-1">Trips</span>
          {isTripsActive && (
            <span className="absolute bottom-0.5 h-0.5 w-6 bg-primary rounded-full" />
          )}
        </Link>

        {/* 5. More (Vehicles, Drivers, Analytics) */}
        <button
          onClick={() => setMoreMenuOpen((prev) => !prev)}
          aria-expanded={moreMenuOpen}
          aria-label="Open More Directories"
          className={`relative flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isMoreActive || moreMenuOpen
              ? 'text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] leading-tight mt-1">More</span>
          {isMoreActive && (
            <span className="absolute bottom-0.5 h-0.5 w-6 bg-primary rounded-full" />
          )}
        </button>
      </nav>
    </>
  );
}
