import { TripLeg } from '@/types/domain';

export interface ITripLegRepository {
  getAll(): Promise<TripLeg[]>;
  getById(id: string): Promise<TripLeg | null>;
  getByRequestId(requestId: string): Promise<TripLeg[]>;
  create(tripLeg: TripLeg): Promise<TripLeg>;
  update(tripLeg: TripLeg): Promise<TripLeg>;
}
