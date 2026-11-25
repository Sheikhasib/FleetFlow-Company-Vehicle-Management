import * as React from 'react';
import { Check, Circle } from 'lucide-react';
import { TripLegStatus } from '@/types/domain';
import { TRIP_LIFECYCLE_MILESTONES } from '@/features/vehicle-requests/types/view-models';

interface DriverMilestoneStepperProps {
  currentStatus: TripLegStatus;
}

// 7 operational driver milestone statuses
const DRIVER_STATUS_STEPS: TripLegStatus[] = [
  'ASSIGNED',
  'ACCEPTED',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'IN_PROGRESS',
  'DROPPED_OFF',
  'COMPLETED',
];

export function DriverMilestoneStepper({ currentStatus }: DriverMilestoneStepperProps) {
  const currentIndex = DRIVER_STATUS_STEPS.indexOf(currentStatus);

  return (
    <div className="w-full py-3 px-1">
      {/* Mobile Horizontal Stepper Scroll Container */}
      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="flex items-center justify-between min-w-[560px] sm:min-w-0 sm:w-full">
          {DRIVER_STATUS_STEPS.map((status, index) => {
            const milestone = TRIP_LIFECYCLE_MILESTONES[status];
            const isCompleted = index < currentIndex || currentStatus === 'COMPLETED';
            const isCurrent = index === currentIndex && currentStatus !== 'COMPLETED';
            const isPending = index > currentIndex;

            return (
              <React.Fragment key={status}>
                {/* Milestone Node */}
                <div className="flex flex-col items-center text-center relative group min-w-[68px]">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-sm animate-pulse'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] sm:text-[11px] font-semibold mt-1.5 leading-tight ${
                      isCurrent
                        ? 'text-primary font-bold'
                        : isCompleted
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {milestone?.shortLabel || status}
                  </span>
                </div>

                {/* Connecting Line between steps */}
                {index < DRIVER_STATUS_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 transition-all ${
                      index < currentIndex || currentStatus === 'COMPLETED'
                        ? 'bg-emerald-600'
                        : 'bg-border'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
