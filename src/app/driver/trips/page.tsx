'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Navigation,
  Search,
  Filter,
  Calendar,
  X,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import {
  selectDriverTrips,
  isActiveDriverTripStatus,
} from '@/features/driver/selectors/driver-selectors';
import { DriverTripCard } from '@/features/driver/components/driver-trip-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type FilterCategory = 'ALL' | 'ACTIVE' | 'UPCOMING' | 'COMPLETED';

export default function DriverTripsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as FilterCategory) || 'ALL';

  const isHydrated = useFleetFlowStore((s) => s.isHydrated);
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const users = useFleetFlowStore((s) => s.users);
  const drivers = useFleetFlowStore((s) => s.drivers);
  const vehicles = useFleetFlowStore((s) => s.vehicles);
  const requests = useFleetFlowStore((s) => s.requests);
  const tripLegs = useFleetFlowStore((s) => s.tripLegs);
  const assignments = useFleetFlowStore((s) => s.assignments);
  const pendingActions = useFleetFlowStore((s) => s.pendingActions);

  const [activeCategory, setActiveCategory] = React.useState<FilterCategory>(initialTab);
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  const pendingLegIds = React.useMemo(() => {
    return new Set(
      pendingActions
        .filter((a) => a.actorUserId === currentUserId && (a.status === 'PENDING' || a.status === 'SYNCING'))
        .map((a) => a.tripLegId)
    );
  }, [pendingActions, currentUserId]);

  const selectorState = React.useMemo(
    () => ({
      users,
      drivers,
      vehicles,
      requests,
      tripLegs,
      assignments,
    }),
    [users, drivers, vehicles, requests, tripLegs, assignments]
  );

  const allTrips = React.useMemo(() => {
    if (!currentUserId) return [];
    return selectDriverTrips(selectorState, currentUserId);
  }, [selectorState, currentUserId]);

  // Counts for filter pills
  const counts = React.useMemo(() => {
    return {
      all: allTrips.length,
      active: allTrips.filter((t) => isActiveDriverTripStatus(t.status)).length,
      upcoming: allTrips.filter((t) => t.status === 'ASSIGNED').length,
      completed: allTrips.filter((t) => t.status === 'COMPLETED').length,
    };
  }, [allTrips]);

  // Filtered trips list
  const filteredTrips = React.useMemo(() => {
    return allTrips.filter((trip) => {
      // Category Filter
      if (activeCategory === 'ACTIVE' && !isActiveDriverTripStatus(trip.status)) {
        return false;
      }
      if (activeCategory === 'UPCOMING' && trip.status !== 'ASSIGNED') {
        return false;
      }
      if (activeCategory === 'COMPLETED' && trip.status !== 'COMPLETED') {
        return false;
      }

      // Search Query Filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      return (
        trip.legId.toLowerCase().includes(q) ||
        trip.requestId.toLowerCase().includes(q) ||
        trip.pickupLocation.toLowerCase().includes(q) ||
        trip.destination.toLowerCase().includes(q) ||
        trip.requesterName.toLowerCase().includes(q) ||
        trip.vehiclePlate.toLowerCase().includes(q) ||
        trip.vehicleModel.toLowerCase().includes(q)
      );
    });
  }, [allTrips, activeCategory, searchQuery]);

  if (!isHydrated) {
    return (
      <div className="container max-w-full md:max-w-4xl lg:max-w-6xl mx-auto py-8 px-4 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground font-medium">Loading driver trips...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-full md:max-w-4xl lg:max-w-6xl mx-auto py-4 sm:py-6 md:py-8 px-4 sm:px-6 md:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/driver/dashboard"
              aria-label="Back to Driver Dashboard"
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8 -ml-1 text-muted-foreground')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              My Assigned Trips
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-9 sm:ml-0">
            Comprehensive itinerary of your active journeys, upcoming dispatches, and completed trip history.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <Button
            variant={activeCategory === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('ALL')}
            className="text-xs h-9 shrink-0 gap-1.5"
          >
            <span>All Trips</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-muted">
              {counts.all}
            </Badge>
          </Button>

          <Button
            variant={activeCategory === 'ACTIVE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('ACTIVE')}
            className="text-xs h-9 shrink-0 gap-1.5"
          >
            <span>Active</span>
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 h-4 ${
                counts.active > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-muted'
              }`}
            >
              {counts.active}
            </Badge>
          </Button>

          <Button
            variant={activeCategory === 'UPCOMING' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('UPCOMING')}
            className="text-xs h-9 shrink-0 gap-1.5"
          >
            <span>Upcoming</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-muted">
              {counts.upcoming}
            </Badge>
          </Button>

          <Button
            variant={activeCategory === 'COMPLETED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('COMPLETED')}
            className="text-xs h-9 shrink-0 gap-1.5"
          >
            <span>Completed</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-muted">
              {counts.completed}
            </Badge>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by pickup location, destination, requester, or plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-10 text-sm bg-card"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search query"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Trips Feed */}
      {filteredTrips.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={searchQuery ? 'No Matching Trips Found' : 'No Trips in this Category'}
          description={
            searchQuery
              ? `No assigned journeys match your search term "${searchQuery}". Try searching with different keywords.`
              : 'There are currently no trips assigned to your profile in this status view.'
          }
          actionLabel={searchQuery ? 'Clear Search Filter' : undefined}
          onAction={searchQuery ? () => setSearchQuery('') : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTrips.map((trip) => (
            <DriverTripCard
              key={trip.legId}
              trip={trip}
              isPriorityActive={isActiveDriverTripStatus(trip.status)}
              isPendingSync={pendingLegIds.has(trip.legId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
