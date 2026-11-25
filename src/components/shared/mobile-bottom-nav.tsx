'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, FileSpreadsheet } from 'lucide-react';

export function MobileBottomNav() {
  const pathname = usePathname();

  const isDashboardActive = pathname === '/employee/dashboard';
  const isNewRequestActive = pathname === '/employee/requests/new';
  const isMyRequestsActive =
    pathname === '/employee/requests' ||
    (pathname.startsWith('/employee/requests/') && pathname !== '/employee/requests/new');

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border shadow-lg h-16 pb-[env(safe-area-inset-bottom)] px-6 flex items-center justify-around"
    >
      {/* 1. Dashboard */}
      <Link
        href="/employee/dashboard"
        aria-current={isDashboardActive ? 'page' : undefined}
        className={`relative flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isDashboardActive
            ? 'text-primary font-semibold'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
        <span className="text-[11px] leading-tight mt-1">Dashboard</span>
        {isDashboardActive && (
          <span className="absolute bottom-0.5 h-0.5 w-6 bg-primary rounded-full" />
        )}
      </Link>

      {/* 2. Elevated Center Action: New Request */}
      <Link
        href="/employee/requests/new"
        aria-current={isNewRequestActive ? 'page' : undefined}
        aria-label="Create New Vehicle Request"
        className="relative flex flex-col items-center justify-center min-w-[64px] min-h-[44px] -mt-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full transition-transform active:scale-95"
      >
        <div
          className={`h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center border-2 border-background hover:bg-primary/90 transition-all ${
            isNewRequestActive ? 'ring-2 ring-primary ring-offset-2' : ''
          }`}
        >
          <PlusCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <span
          className={`text-[10px] font-semibold mt-1 leading-none ${
            isNewRequestActive ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          New Request
        </span>
      </Link>

      {/* 3. My Requests */}
      <Link
        href="/employee/requests"
        aria-current={isMyRequestsActive ? 'page' : undefined}
        className={`relative flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isMyRequestsActive
            ? 'text-primary font-semibold'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
        <span className="text-[11px] leading-tight mt-1">My Requests</span>
        {isMyRequestsActive && (
          <span className="absolute bottom-0.5 h-0.5 w-6 bg-primary rounded-full" />
        )}
      </Link>
    </nav>
  );
}
