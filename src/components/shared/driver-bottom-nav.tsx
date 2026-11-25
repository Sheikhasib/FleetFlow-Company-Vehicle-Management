'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Navigation, LogOut } from 'lucide-react';

export function DriverBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide bottom nav on execution page (/driver/trips/[id]) to yield full viewport to execution action bar
  const isExecutionPage =
    pathname.startsWith('/driver/trips/') && pathname !== '/driver/trips';
  if (isExecutionPage) {
    return null;
  }

  const isDashboardActive = pathname === '/driver/dashboard';
  const isTripsActive = pathname === '/driver/trips';

  return (
    <nav
      aria-label="Driver Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border shadow-lg h-16 pb-[env(safe-area-inset-bottom)] px-6 flex items-center justify-around"
    >
      {/* 1. Dashboard */}
      <Link
        href="/driver/dashboard"
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

      {/* 2. My Trips */}
      <Link
        href="/driver/trips"
        aria-current={isTripsActive ? 'page' : undefined}
        className={`relative flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isTripsActive
            ? 'text-primary font-semibold'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Navigation className="h-5 w-5" aria-hidden="true" />
        <span className="text-[11px] leading-tight mt-1">My Trips</span>
        {isTripsActive && (
          <span className="absolute bottom-0.5 h-0.5 w-6 bg-primary rounded-full" />
        )}
      </Link>

      {/* 3. Switch Persona / Sign Out */}
      <button
        onClick={() => router.push('/login')}
        aria-label="Switch Persona or Sign Out"
        className="relative flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1 transition-colors rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
        <span className="text-[11px] leading-tight mt-1">Switch</span>
      </button>
    </nav>
  );
}
