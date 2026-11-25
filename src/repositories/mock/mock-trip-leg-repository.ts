import { TripLeg } from '@/types/domain';
import { ITripLegRepository } from '../interfaces/trip-leg-repository.interface';
import { useFleetFlowStore } from '@/stores/fleetflow-store';

export class MockTripLegRepository implements ITripLegRepository {
  async getAll(): Promise<TripLeg[]> {
    return [...useFleetFlowStore.getState().tripLegs];
  }

  async getById(id: string): Promise<TripLeg | null> {
    const leg = useFleetFlowStore.getState().tripLegs.find((l) => l.id === id);
    return leg ? { ...leg } : null;
  }

  async getByRequestId(requestId: string): Promise<TripLeg[]> {
    return useFleetFlowStore
      .getState()
      .tripLegs.filter((l) => l.requestId === requestId)
      .map((l) => ({ ...l }));
  }

  async create(tripLeg: TripLeg): Promise<TripLeg> {
    useFleetFlowStore.getState().addTripLeg(tripLeg);
    return { ...tripLeg };
  }

  async update(tripLeg: TripLeg): Promise<TripLeg> {
    useFleetFlowStore.getState().updateTripLeg(tripLeg);
    return { ...tripLeg };
  }
}

export const tripLegRepository = new MockTripLegRepository();
