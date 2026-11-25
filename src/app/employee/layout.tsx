'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Car,
  LayoutDashboard,
  FileSpreadsheet,
  PlusCircle,
  LogOut,
} from 'lucide-react';
import { EmployeeAuthGuard } from '@/components/shared/employee-auth-guard';
import { MobileBottomNav } from '@/components/shared/mobile-bottom-nav';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import { NotificationPopover } from '@/features/notifications/components/notification-popover';
import {
  selectEmployeeNotifications,
  selectUnreadNotificationCount,
  isValidEmployeeRequestLink,
} from '@/features/notifications/selectors/notification-selectors';
import { notificationService } from '@/services/notification-service';

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isHydrated = useFleetFlowStore((s) => s.isHydrated);
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const users = useFleetFlowStore((s) => s.users);
  const notifications = useFleetFlowStore((s) => s.notifications);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];
  const isEmployeeActive = isHydrated && currentUser?.role === 'EMPLOYEE';

  // Caller-owned reference instant for deterministic notification formatting
  const [referenceTime] = React.useState<Date>(() => new Date());

  // Notification popover panel state & trigger ref for focus restoration
  const [isPopoverOpen, setIsPopoverOpen] = React.useState<boolean>(false);
  const bellTriggerRef = React.useRef<HTMLButtonElement>(null);

  // In-flight guard to prevent duplicate concurrent mark-as-read calls
  const inFlightMarkAsReadRef = React.useRef<Set<string>>(new Set());

  // Selectors: isolated to the active employee persona
  const unreadCount = React.useMemo(() => {
    if (!isEmployeeActive || !currentUser) return 0;
    return selectUnreadNotificationCount(notifications, currentUser.id);
  }, [isEmployeeActive, currentUser, notifications]);

  const notificationItems = React.useMemo(() => {
    if (!isEmployeeActive || !currentUser) return [];
    return selectEmployeeNotifications(notifications, currentUser.id, referenceTime);
  }, [isEmployeeActive, currentUser, notifications, referenceTime]);

  const handleTogglePopover = React.useCallback(() => {
    setIsPopoverOpen((prev) => !prev);
  }, []);

  const handleClosePopover = React.useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  // Mark-as-read delegating strictly to NotificationService (5-layer architecture)
  const handleMarkAsRead = React.useCallback(async (id: string): Promise<boolean> => {
    if (inFlightMarkAsReadRef.current.has(id)) {
      return false;
    }
    inFlightMarkAsReadRef.current.add(id);
    try {
      const success = await notificationService.markAsRead(id);
      return success;
    } catch (error) {
      console.error('Failed to mark notification as read via service:', error);
      return false;
    } finally {
      inFlightMarkAsReadRef.current.delete(id);
    }
  }, []);

  // Safe navigation: only approved Employee request deep-links are allowed
  const handleNavigate = React.useCallback(
    (link: string) => {
      if (isValidEmployeeRequestLink(link)) {
        router.push(link);
      }
    },
    [router]
  );

  const navItems = [
    {
      label: 'Dashboard',
      href: '/employee/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/employee/dashboard',
    },
    {
      label: 'My Requests',
      href: '/employee/requests',
      icon: FileSpreadsheet,
      active:
        pathname === '/employee/requests' ||
        (pathname.startsWith('/employee/requests/') && pathname !== '/employee/requests/new'),
    },
  ];

  const userInitials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('');

  return (
    <EmployeeAuthGuard>
      <div className="min-h-screen bg-muted/20 flex flex-col">
        {/* ============================================================== */}
        {/* RESPONSIVE APPLICATION HEADER                                  */}
        {/* Mobile: h-12 (48px) | Tablet: h-14 (56px) | Desktop: h-16 (64px)*/}
        {/* Top offset: top-7 on mobile (28px), top-9 on tablet/desktop (36px)*/}
        {/* ============================================================== */}
        <header className="sticky top-7 md:top-9 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container max-w-full md:max-w-4xl lg:max-w-6xl mx-auto flex h-12 md:h-14 lg:h-16 items-center justify-between px-4 sm:px-6 md:px-6 lg:px-8">
            {/* Left: Brand Mark & Tablet/Desktop Nav Links */}
            <div className="flex items-center gap-4 lg:gap-6">
              <Link
                href="/employee/dashboard"
                className="flex items-center gap-2 md:gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex h-7 w-7 md:h-8 md:w-8 lg:h-9 lg:w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm flex-shrink-0">
                  <Car className="h-4 w-4 md:h-4.5 md:w-4.5 lg:h-5 lg:w-5" aria-hidden="true" />
                </div>
                <div>
                  <div className="font-bold text-sm md:text-sm lg:text-base tracking-tight text-foreground leading-none">
                    FleetFlow
                  </div>
                  <div className="hidden sm:block text-[10px] text-muted-foreground uppercase font-semibold tracking-wider pt-0.5">
                    Employee Portal
                  </div>
                </div>
              </Link>

              {/* Tablet & Desktop Nav Links */}
              <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1 ml-2 lg:ml-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={item.active ? 'page' : undefined}
                      className={`flex items-center gap-2 px-3 py-1.5 lg:py-2 rounded-md text-sm font-medium transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        item.active
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: Viewport-Adaptive Actions & User Persona */}
            <div className="flex items-center gap-2 md:gap-2.5 lg:gap-3">
              {/* Desktop "+ New Request" button */}
              <Button
                size="sm"
                onClick={() => router.push('/employee/requests/new')}
                className="hidden lg:flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                <span>New Request</span>
              </Button>

              {/* Tablet "+ New" button */}
              <Button
                size="sm"
                onClick={() => router.push('/employee/requests/new')}
                aria-label="New Request"
                className="hidden md:flex lg:hidden items-center gap-1 text-xs px-2.5 h-8"
              >
                <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>New</span>
                <span className="sr-only"> Request</span>
              </Button>

              {/* Divider between CTA and Bell on Tablet & Desktop */}
              <div className="hidden md:block h-5 lg:h-6 w-px bg-border" aria-hidden="true" />

              {/* Notification Bell & Popover (Unified instance for all viewports) */}
              {isEmployeeActive && (
                <div className="relative flex items-center">
                  <NotificationBell
                    ref={bellTriggerRef}
                    id="notification-bell-trigger"
                    popoverId="notification-popover-panel"
                    count={unreadCount}
                    isOpen={isPopoverOpen}
                    onClick={handleTogglePopover}
                  />
                  <NotificationPopover
                    isOpen={isPopoverOpen}
                    items={notificationItems}
                    onClose={handleClosePopover}
                    onMarkAsRead={handleMarkAsRead}
                    onNavigate={handleNavigate}
                    triggerRef={bellTriggerRef}
                    triggerId="notification-bell-trigger"
                    id="notification-popover-panel"
                  />
                </div>
              )}

              {/* Divider between Bell and User Persona */}
              <div className="h-4 md:h-5 lg:h-6 w-px bg-border" aria-hidden="true" />

              {/* Desktop User Profile Pill (lg:flex) */}
              <div className="hidden lg:flex items-center gap-2.5 pl-1">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {userInitials}
                </div>
                <div className="text-left text-xs leading-tight">
                  <div className="font-semibold text-foreground">{currentUser.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {currentUser.department || 'Employee'}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/login')}
                  title="Switch Persona or Sign Out"
                  aria-label="Switch Persona or Sign Out"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground ml-1"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              {/* Tablet Compact User Chip (md:flex lg:hidden) */}
              <div className="hidden md:flex lg:hidden items-center gap-1.5">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                  {userInitials}
                </div>
                <span className="text-xs font-medium text-foreground truncate max-w-[90px]">
                  {currentUser.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/login')}
                  title="Switch Persona or Sign Out"
                  aria-label="Switch Persona or Sign Out"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>

              {/* Mobile Header Actions (< md) */}
              <div className="flex md:hidden items-center gap-2">
                <div className="flex items-center gap-1.5 bg-muted/50 rounded-full pl-1 pr-2 py-0.5 border border-border/60">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    {userInitials}
                  </div>
                  <span className="text-xs font-medium text-foreground truncate max-w-[80px]">
                    {currentUser.name.split(' ')[0]}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/login')}
                  title="Switch Persona or Sign Out"
                  aria-label="Switch Persona or Sign Out"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================================== */}
        {/* MAIN PAGE CONTAINER                                            */}
        {/* pb-24 on mobile ensures 64px docked bottom nav never obscures  */}
        {/* ============================================================== */}
        <main className="flex-1 container max-w-full md:max-w-4xl lg:max-w-6xl mx-auto px-4 sm:px-6 md:px-6 lg:px-8 pt-3 md:py-6 lg:py-8 pb-24 md:pb-8">
          {children}
        </main>

        {/* ============================================================== */}
        {/* MOBILE BOTTOM NAVIGATION BAR (< md)                            */}
        {/* ============================================================== */}
        <MobileBottomNav />
      </div>
    </EmployeeAuthGuard>
  );
}
