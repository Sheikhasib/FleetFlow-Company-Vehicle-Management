import { Assignment } from '@/types/domain';
import { IAssignmentRepository } from '../interfaces/assignment-repository.interface';
import { useFleetFlowStore } from '@/stores/fleetflow-store';

export class MockAssignmentRepository implements IAssignmentRepository {
  async getAll(): Promise<Assignment[]> {
    return [...useFleetFlowStore.getState().assignments];
  }

  async getById(id: string): Promise<Assignment | null> {
    const assignment = useFleetFlowStore.getState().assignments.find((a) => a.id === id);
    return assignment ? { ...assignment } : null;
  }

  async getByTripLegId(tripLegId: string): Promise<Assignment | null> {
    const assignment = useFleetFlowStore
      .getState()
      .assignments.find((a) => a.tripLegId === tripLegId && a.status === 'ACTIVE');
    return assignment ? { ...assignment } : null;
  }

  async getByDriverId(driverId: string): Promise<Assignment[]> {
    return useFleetFlowStore
      .getState()
      .assignments.filter((a) => a.driverId === driverId)
      .map((a) => ({ ...a }));
  }

  async getByVehicleId(vehicleId: string): Promise<Assignment[]> {
    return useFleetFlowStore
      .getState()
      .assignments.filter((a) => a.vehicleId === vehicleId)
      .map((a) => ({ ...a }));
  }

  async create(assignment: Assignment): Promise<Assignment> {
    useFleetFlowStore.getState().addAssignment(assignment);
    return { ...assignment };
  }

  async update(assignment: Assignment): Promise<Assignment> {
    useFleetFlowStore.getState().updateAssignment(assignment);
    return { ...assignment };
  }
}

export const assignmentRepository = new MockAssignmentRepository();
