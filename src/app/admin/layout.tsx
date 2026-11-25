'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Car,
  LayoutDashboard,
  ClipboardList,
  UserCheck,
  Navigation,
  Users,
  BarChart3,
  Shield,
} from 'lucide-react';
import { AdminAuthGuard } from '@/components/shared/admin-auth-guard';
import { AdminBottomNav } from '@/components/shared/admin-bottom-nav';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import { NotificationPopover } from '@/features/notifications/components/notification-popover';
import {
  selectAdminNotifications,
  selectUnreadNotificationCount,
  isValidAdminRequestLink,
} from '@/features/notifications/selectors/notification-selectors';
import { notificationService } from '@/services/notification-service';

export default function AdminLayout({
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
  const isAdminActive = isHydrated && currentUser?.role === 'ADMIN';

  const [referenceTime] = React.useState<Date>(() => new Date());
  const [isPopoverOpen, setIsPopoverOpen] = React.useState<boolean>(false);
  const bellTriggerRef = React.useRef<HTMLButtonElement>(null);
  const inFlightMarkAsReadRef = React.useRef<Set<string>>(new Set());

  // Unread badge count isolated to active admin persona
  const unreadCount = React.useMemo(() => {
    if (!isAdminActive || !currentUser) return 0;
    return selectUnreadNotificationCount(notifications, currentUser.id);
  }, [isAdminActive, currentUser, notifications]);

  // Notifications for the active admin persona
  const notificationItems = React.useMemo(() => {
    if (!isAdminActive || !currentUser) return [];
    return selectAdminNotifications(notifications, currentUser.id, referenceTime);
  }, [isAdminActive, currentUser, notifications, referenceTime]);

  const handleTogglePopover = React.useCallback(() => {
    setIsPopoverOpen((prev) => !prev);
  }, []);

  const handleClosePopover = React.useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const handleMarkAsRead = React.useCallback(async (id: string): Promise<boolean> => {
    if (inFlightMarkAsReadRef.current.has(id)) {
      return false;
    }
    inFlightMarkAsReadRef.current.add(id);
    try {
      return await notificationService.markAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read via service:', error);
      return false;
    } finally {
      inFlightMarkAsReadRef.current.delete(id);
    }
  }, []);

  const handleNavigate = React.useCallback(
    (link: string) => {
      if (isValidAdminRequestLink(link)) {
        router.push(link);
      }
    },
    [router]
  );

  const navItems = [
    {
      label: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/admin/dashboard',
    },
    {
      label: 'Requests',
      href: '/admin/requests',
      icon: ClipboardList,
      active: pathname === '/admin/requests' || pathname.startsWith('/admin/requests/'),
    },
    {
      label: 'Assignments',
      href: '/admin/assignments',
      icon: UserCheck,
      active: pathname === '/admin/assignments',
    },
    {
      label: 'Trips',
      href: '/admin/trips',
      icon: Navigation,
      active: pathname === '/admin/trips',
    },
    {
      label: 'Vehicles',
      href: '/admin/vehicles',
      icon: Car,
      active: pathname === '/admin/vehicles',
    },
    {
      label: 'Drivers',
      href: '/admin/drivers',
      icon: Users,
      active: pathname === '/admin/drivers',
    },
    {
      label: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      active: pathname === '/admin/analytics',
    },
  ];

  const userInitials = (currentUser?.name || 'AD')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-muted/20 flex flex-col">
        {/* Responsive Application Header sitting below Demo Toolbar */}
        <header className="sticky top-7 md:top-9 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container max-w-full md:max-w-6xl lg:max-w-7xl mx-auto flex h-12 md:h-14 lg:h-16 items-center justify-between px-4 sm:px-6 md:px-6 lg:px-8">
            {/* Left: Brand Mark & Tablet/Desktop Nav Links */}
            <div className="flex items-center gap-3 lg:gap-6">
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 md:gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex h-7 w-7 md:h-8 md:w-8 lg:h-9 lg:w-9 items-center justify-center rounded-lg bg-slate-900 text-white font-bold shadow-sm flex-shrink-0">
                  <Shield className="h-4 w-4 md:h-4.5 md:w-4.5 lg:h-5 lg:w-5 text-amber-400" aria-hidden="true" />
                </div>
                <div>
                  <div className="font-bold text-sm md:text-sm lg:text-base tracking-tight text-foreground leading-none">
                    FleetFlow
                  </div>
                  <div className="hidden sm:block text-[10px] text-muted-foreground uppercase font-semibold tracking-wider pt-0.5">
                    Admin Portal
                  </div>
                </div>
              </Link>

              {/* Tablet & Desktop Nav Links */}
              <nav aria-label="Admin Navigation" className="hidden md:flex items-center gap-0.5 lg:gap-1 ml-1 lg:ml-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={item.active ? 'page' : undefined}
                      className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-md text-xs lg:text-sm font-medium transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        item.active
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: Notification Bell & Admin Identity */}
            <div className="flex items-center gap-2 md:gap-3">
              {isAdminActive && (
                <div className="relative">
                  <NotificationBell
                    count={unreadCount}
                    isOpen={isPopoverOpen}
                    onClick={handleTogglePopover}
                    ref={bellTriggerRef}
                  />

                  <NotificationPopover
                    isOpen={isPopoverOpen}
                    items={notificationItems}
                    onClose={handleClosePopover}
                    onMarkAsRead={handleMarkAsRead}
                    onNavigate={handleNavigate}
                    triggerRef={bellTriggerRef}
                  />
                </div>
              )}

              <div className="h-5 lg:h-6 w-px bg-border hidden sm:block" aria-hidden="true" />

              {/* Admin Persona Pill */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-slate-900 text-slate-100 flex items-center justify-center font-bold text-xs border border-border shadow-xs">
                  {userInitials}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-semibold text-foreground line-clamp-1">
                    {currentUser?.name || 'Administrator'}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-amber-50 text-amber-700 border-amber-200">
                      ADMIN
                    </Badge>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 pb-20 md:pb-8">
          {children}
        </main>

        {/* Mobile Viewport Bottom Navigation */}
        <AdminBottomNav />
      </div>
    </AdminAuthGuard>
  );
}
