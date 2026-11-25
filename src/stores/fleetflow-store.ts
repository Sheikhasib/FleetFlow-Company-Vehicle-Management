import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  User,
  Vehicle,
  Driver,
  VehicleRequest,
  TripLeg,
  Assignment,
  Passenger,
  ActivityLog,
  Notification,
  VehicleStatus,
  DriverStatus,
  RequestBundle,
} from '@/types/domain';
import { DriverPendingAction } from '@/features/driver/types/offline-types';
import { initialSeedData, getSeedData } from '@/data/seed/seed-data';

export interface FleetFlowState {
  // Application Data (Single Source of Truth)
  users: User[];
  vehicles: Vehicle[];
  drivers: Driver[];
  requests: VehicleRequest[];
  tripLegs: TripLeg[];
  assignments: Assignment[];
  passengers: Passenger[];
  activityLogs: ActivityLog[];
  notifications: Notification[];

  // Offline capability & Pending Actions (Stage 5.3)
  pendingActions: DriverPendingAction[];
  isSimulatedOffline: boolean;

  // Session & Demo state
  currentUserId: string;
  isHydrated: boolean;

  // Actions
  setHydrated: (val: boolean) => void;
  setCurrentUser: (userId: string) => void;
  setSimulatedOffline: (val: boolean) => void;

  // Offline Queue Actions
  enqueuePendingAction: (action: DriverPendingAction) => void;
  updatePendingAction: (id: string, updates: Partial<DriverPendingAction>) => void;
  removePendingAction: (id: string) => void;
  clearPendingActionsForUser: (userId: string) => void;
  
  // Atomic Request Creation
  createRequestBundle: (bundle: RequestBundle) => void;

  // Entity Mutations (Used by Repositories and Services)
  addRequest: (request: VehicleRequest) => void;
  updateRequest: (request: VehicleRequest) => void;
  
  addTripLeg: (tripLeg: TripLeg) => void;
  updateTripLeg: (tripLeg: TripLeg) => void;
  
  addAssignment: (assignment: Assignment) => void;
  updateAssignment: (assignment: Assignment) => void;
  
  addPassenger: (passenger: Passenger) => void;
  
  addActivityLog: (log: ActivityLog) => void;
  
  addNotification: (notification: Notification) => void;
  markNotificationRead: (notificationId: string) => void;
  
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  updateDriverStatus: (driverId: string, status: DriverStatus) => void;

  // Reset demo data to pristine relative seed data
  resetData: () => void;
}

export const useFleetFlowStore = create<FleetFlowState>()(
  persist(
    (set, get) => ({
      users: initialSeedData.users,
      vehicles: initialSeedData.vehicles,
      drivers: initialSeedData.drivers,
      requests: initialSeedData.requests,
      tripLegs: initialSeedData.tripLegs,
      assignments: initialSeedData.assignments,
      passengers: initialSeedData.passengers,
      activityLogs: initialSeedData.activityLogs,
      notifications: initialSeedData.notifications,
      pendingActions: [],
      isSimulatedOffline: false,

      currentUserId: 'usr_adm_01', // Default demo user
      isHydrated: false,

      setHydrated: (val: boolean) => set({ isHydrated: val }),
      setCurrentUser: (userId: string) => set({ currentUserId: userId }),
      setSimulatedOffline: (val: boolean) => set({ isSimulatedOffline: val }),

      enqueuePendingAction: (action: DriverPendingAction) =>
        set((state) => ({
          // Append in FIFO order, avoiding duplicates
          pendingActions: state.pendingActions.some((a) => a.id === action.id)
            ? state.pendingActions
            : [...state.pendingActions, action],
        })),

      updatePendingAction: (id: string, updates: Partial<DriverPendingAction>) =>
        set((state) => ({
          pendingActions: state.pendingActions.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),

      removePendingAction: (id: string) =>
        set((state) => ({
          pendingActions: state.pendingActions.filter((a) => a.id !== id),
        })),

      clearPendingActionsForUser: (userId: string) =>
        set((state) => ({
          pendingActions: state.pendingActions.filter((a) => a.actorUserId !== userId),
        })),

      createRequestBundle: (bundle: RequestBundle) =>
        set((state) => ({
          requests: [bundle.request, ...state.requests],
          tripLegs: [...state.tripLegs, ...bundle.tripLegs],
          passengers: [...state.passengers, ...bundle.passengers],
          activityLogs: [bundle.activityLog, ...state.activityLogs],
          notifications: [bundle.notification, ...state.notifications],
        })),

      addRequest: (request: VehicleRequest) =>
        set((state) => ({ requests: [request, ...state.requests] })),

      updateRequest: (request: VehicleRequest) =>
        set((state) => ({
          requests: state.requests.map((r) => (r.id === request.id ? request : r)),
        })),

      addTripLeg: (tripLeg: TripLeg) =>
        set((state) => ({ tripLegs: [...state.tripLegs, tripLeg] })),

      updateTripLeg: (tripLeg: TripLeg) =>
        set((state) => ({
          tripLegs: state.tripLegs.map((l) => (l.id === tripLeg.id ? tripLeg : l)),
        })),

      addAssignment: (assignment: Assignment) =>
        set((state) => ({ assignments: [...state.assignments, assignment] })),

      updateAssignment: (assignment: Assignment) =>
        set((state) => ({
          assignments: state.assignments.map((a) => (a.id === assignment.id ? assignment : a)),
        })),

      addPassenger: (passenger: Passenger) =>
        set((state) => ({ passengers: [...state.passengers, passenger] })),

      addActivityLog: (log: ActivityLog) =>
        set((state) => ({ activityLogs: [log, ...state.activityLogs] })),

      addNotification: (notification: Notification) =>
        set((state) => ({ notifications: [notification, ...state.notifications] })),

      markNotificationRead: (notificationId: string) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
        })),

      updateVehicleStatus: (vehicleId: string, status: VehicleStatus) =>
        set((state) => ({
          vehicles: state.vehicles.map((v) => (v.id === vehicleId ? { ...v, status } : v)),
        })),

      updateDriverStatus: (driverId: string, status: DriverStatus) =>
        set((state) => ({
          drivers: state.drivers.map((d) => (d.id === driverId ? { ...d, status } : d)),
        })),

      resetData: () => {
        const freshSeed = getSeedData();
        set({
          users: freshSeed.users,
          vehicles: freshSeed.vehicles,
          drivers: freshSeed.drivers,
          requests: freshSeed.requests,
          tripLegs: freshSeed.tripLegs,
          assignments: freshSeed.assignments,
          passengers: freshSeed.passengers,
          activityLogs: freshSeed.activityLogs,
          notifications: freshSeed.notifications,
          pendingActions: [],
          isSimulatedOffline: false,
        });
      },
    }),
    {
      name: 'fleetflow_state_storage',
      version: 1,
      storage: createJSONStorage(() => {
        // Safe SSR check for Next.js App Router
        if (typeof window !== 'undefined') {
          return {
            getItem: (name: string) => {
              try {
                const item = window.localStorage.getItem(name);
                if (!item) return null;
                // Validate JSON syntax
                JSON.parse(item);
                return item;
              } catch {
                console.warn(
                  `[FleetFlow Persistence] Corrupted storage detected for ${name}. Resetting.`
                );
                window.localStorage.removeItem(name);
                return null;
              }
            },
            setItem: (name: string, value: string) => {
              try {
                window.localStorage.setItem(name, value);
              } catch (e) {
                console.error(`[FleetFlow Persistence] Failed to save state to localStorage:`, e);
              }
            },
            removeItem: (name: string) => {
              try {
                window.localStorage.removeItem(name);
              } catch {}
            },
          };
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      migrate: (persistedState: unknown, version: number) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState as unknown as FleetFlowState;
        }
        const stateObj = persistedState as Record<string, unknown>;
        if (version === 0) {
          return {
            ...stateObj,
            pendingActions: Array.isArray(stateObj.pendingActions) ? stateObj.pendingActions : [],
            isSimulatedOffline: false,
          } as unknown as FleetFlowState;
        }
        return stateObj as unknown as FleetFlowState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);
