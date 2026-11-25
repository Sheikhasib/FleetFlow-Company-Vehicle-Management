'use client';

import * as React from 'react';
import { Bell, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { NotificationViewModel } from '../types/view-models';

export interface NotificationPopoverProps {
  /** Controls visibility of the popover panel */
  isOpen: boolean;
  /** Notifications list to display, formatted as NotificationViewModel */
  items: NotificationViewModel[];
  /** Callback to close the popover panel */
  onClose: () => void;
  /** Callback when an unread notification is clicked to mark it as read */
  onMarkAsRead?: (id: string) => void | boolean | Promise<void | boolean>;
  /** Callback to navigate to an approved deep link */
  onNavigate?: (link: string) => void;
  /** Ref to the trigger element to restore focus upon close */
  triggerRef?: React.RefObject<HTMLElement | null>;
  /** ID of the trigger element for focus restoration fallback */
  triggerId?: string;
  /** HTML ID for the popover panel (for aria-controls compatibility) */
  id?: string;
  /** Optional custom class name */
  className?: string;
  /**
   * Modal mode configuration:
   * - When true: Acts as a modal dialog (aria-modal="true", traps focus, body scroll lock, modal backdrop).
   * - When false: Acts as a non-modal dropdown (no aria-modal, natural tab navigation, no scroll lock).
   * - When undefined: Automatically true on mobile (< 768px) and false on tablet/desktop (>= 768px).
   */
  isModal?: boolean;
}

/**
 * Focus trap helper for modal dialogs.
 * Cycles Tab from last element to first, and Shift+Tab from first element to last.
 * Exported for deterministic unit testing.
 */
export function handleDialogTabTrap(
  e: KeyboardEvent | React.KeyboardEvent,
  container: HTMLElement | null,
  isModal: boolean
): boolean {
  if (!isModal || e.key !== 'Tab' || !container) {
    return false;
  }

  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );

  if (focusables.length === 0) {
    e.preventDefault();
    container.focus();
    return true;
  }

  const firstElement = focusables[0];
  const lastElement = focusables[focusables.length - 1];
  const active = typeof document !== 'undefined' ? document.activeElement : null;

  if (e.shiftKey) {
    // Backward tab: if on first element or container, loop to last element
    if (active === firstElement || active === container) {
      e.preventDefault();
      lastElement.focus();
      return true;
    }
  } else {
    // Forward tab: if on last element or container, loop to first element
    if (active === lastElement || active === container) {
      e.preventDefault();
      firstElement.focus();
      return true;
    }
  }

  return false;
}

/**
 * Accessible, responsive notification popover panel for FleetFlow.
 * Enforces dual interaction modes:
 * - Mobile (< 768px): Modal dialog (aria-modal="true", focus trap, body scroll lock, backdrop).
 * - Tablet & Desktop (>= 768px): Non-modal floating dropdown (no aria-modal, no focus trap, natural tab navigation).
 */
export function NotificationPopover({
  isOpen,
  items,
  onClose,
  onMarkAsRead,
  onNavigate,
  triggerRef,
  triggerId = 'notification-bell-trigger',
  id = 'notification-popover-panel',
  className,
  isModal,
}: NotificationPopoverProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  // Responsive mobile detection (SSR-safe, defaults to false on server)
  const [isMobileViewport, setIsMobileViewport] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 767px)');
    const updateMobile = () => setIsMobileViewport(mql.matches);
    updateMobile();
    mql.addEventListener('change', updateMobile);
    return () => mql.removeEventListener('change', updateMobile);
  }, []);

  // Modal mode: explicit prop takes precedence, otherwise responsive viewport determines mode
  const isEffectiveModal = isModal !== undefined ? isModal : isMobileViewport;

  const unreadCount = React.useMemo(
    () => items.filter((item) => !item.read).length,
    [items]
  );

  // Focus restoration helper: safely returns focus to the bell trigger button
  const restoreFocus = React.useCallback(() => {
    if (typeof document === 'undefined') return;
    const triggerEl = triggerRef?.current || (triggerId ? document.getElementById(triggerId) : null);
    if (triggerEl && typeof triggerEl.focus === 'function' && document.contains(triggerEl)) {
      try {
        triggerEl.focus();
      } catch {
        // Safe fallback if element cannot receive focus
      }
    }
  }, [triggerRef, triggerId]);

  // Focus management, keyboard handlers, and outside click listeners
  React.useEffect(() => {
    if (!isOpen) return;

    // 1. Lock body scrolling ONLY in modal mobile mode
    if (isEffectiveModal && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    // 2. Initial focus entry: move focus to close button or first interactive element
    const timer = setTimeout(() => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      } else if (panelRef.current) {
        panelRef.current.focus();
      }
    }, 30);

    // 3. Keydown handler: Escape to close and Tab focus trap (if modal)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        restoreFocus();
        return;
      }

      if (e.key === 'Tab') {
        handleDialogTabTrap(e, panelRef.current, isEffectiveModal);
      }
    };

    // 4. Outside pointer down handler (dismisses popover)
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      const panelEl = panelRef.current;
      const triggerEl = triggerRef?.current || (triggerId && typeof document !== 'undefined' ? document.getElementById(triggerId) : null);

      if (panelEl && panelEl.contains(target)) return;
      if (triggerEl && triggerEl.contains(target)) return;

      onClose();
      // On mobile modal backdrop click, restore focus to trigger
      if (isEffectiveModal) {
        restoreFocus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      clearTimeout(timer);
      if (isEffectiveModal && typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen, isEffectiveModal, onClose, restoreFocus, triggerRef, triggerId]);

  // Click handler implementing the approved v1.2.1 interaction lifecycle
  const handleItemClick = async (item: NotificationViewModel) => {
    // 1. Mark as read only if currently unread
    if (!item.read && onMarkAsRead) {
      try {
        const result = await onMarkAsRead(item.id);
        if (result === false) {
          return;
        }
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
        return;
      }
    }

    // 2. Deep link navigation: only if link is valid
    if (item.hasValidLink && item.link) {
      onClose();
      if (onNavigate) {
        onNavigate(item.link);
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile backdrop overlay: rendered ONLY in modal mode (< md) */}
      {isEffectiveModal && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] md:hidden"
          onClick={() => {
            onClose();
            restoreFocus();
          }}
          aria-hidden="true"
        />
      )}

      {/* Main popover panel */}
      <div
        ref={panelRef}
        id={id}
        tabIndex={-1}
        role="dialog"
        aria-modal={isEffectiveModal ? 'true' : undefined}
        aria-labelledby="notification-popover-title"
        className={cn(
          // Mobile (< md): Viewport anchored below header, above bottom nav
          'fixed top-[80px] left-2 right-2 bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+8px)] z-50',
          'flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl focus:outline-none',
          // Tablet & Desktop (>= md): Anchored floating dropdown below bell trigger
          'md:absolute md:top-full md:right-0 md:bottom-auto md:left-auto md:mt-2',
          'md:w-[380px] md:max-h-[480px] md:shadow-lg',
          className
        )}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2
              id="notification-popover-title"
              className="font-semibold text-sm text-foreground tracking-tight"
            >
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {unreadCount} unread
              </span>
            )}
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => {
              onClose();
              restoreFocus();
            }}
            aria-label="Close notifications"
            className={cn(
              'p-1.5 rounded-md text-muted-foreground transition-colors',
              'hover:text-foreground hover:bg-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Panel Content (Independently scrollable) */}
        <div
          role="feed"
          aria-label="Notifications list"
          className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1.5 focus:outline-none"
        >
          {items.length === 0 ? (
            <EmptyState
              title="No Notifications"
              description="You're all caught up! Updates regarding your vehicle requests and trips will appear here."
              icon={Bell}
              className="border-none bg-transparent py-8 my-auto"
            />
          ) : (
            items.map((item) => {
              const isUnread = !item.read;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-colors motion-reduce:transition-none border',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    isUnread
                      ? 'bg-primary/5 hover:bg-primary/10 border-primary/20 border-l-4 border-l-primary'
                      : 'bg-card hover:bg-muted/40 border-border/60 border-l-4 border-l-transparent'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Title with screen-reader read status */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isUnread && (
                        <span
                          className="h-2 w-2 rounded-full bg-primary flex-shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span className="sr-only">
                        {isUnread ? 'Unread notification: ' : 'Read notification: '}
                      </span>
                      <h3
                        className={cn(
                          'text-xs tracking-tight truncate',
                          isUnread
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-foreground/80'
                        )}
                      >
                        {item.title}
                      </h3>
                    </div>

                    {/* Relative timestamp */}
                    <time
                      dateTime={item.createdAt}
                      title={item.displayDateTime}
                      className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0 font-medium"
                    >
                      {item.relativeTime}
                    </time>
                  </div>

                  {/* Message body */}
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words leading-relaxed">
                    {item.message}
                  </p>

                  {/* Deep link cue if valid internal link */}
                  {item.hasValidLink && (
                    <div className="mt-2 flex items-center justify-end gap-0.5 text-[11px] font-medium text-primary">
                      <span>View details</span>
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
