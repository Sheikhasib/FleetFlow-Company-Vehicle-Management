import { Assignment } from '@/types/domain';

export interface IAssignmentRepository {
  getAll(): Promise<Assignment[]>;
  getById(id: string): Promise<Assignment | null>;
  getByTripLegId(tripLegId: string): Promise<Assignment | null>;
  getByDriverId(driverId: string): Promise<Assignment[]>;
  getByVehicleId(vehicleId: string): Promise<Assignment[]>;
  create(assignment: Assignment): Promise<Assignment>;
  update(assignment: Assignment): Promise<Assignment>;
}
