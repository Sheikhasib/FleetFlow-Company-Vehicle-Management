import { z } from 'zod';
import { localDateTimeToIso } from '@/lib/utils/date';

export const colleagueSchema = z.object({
  name: z.string().trim().min(2, 'Colleague name must be at least 2 characters'),
  employeeId: z.string().trim().optional(),
  department: z.string().trim().optional(),
});

export const requestFormSchema = z
  .object({
    tripType: z.enum(['ONE_WAY', 'ROUND_TRIP']),
    pickupLocation: z.string().trim().min(2, 'Pickup location is required'),
    destination: z.string().trim().min(2, 'Destination is required'),
    scheduledDeparture: z.string().min(1, 'Scheduled departure date/time is required'),
    returnDeparture: z.string().optional(),
    returnPickup: z.string().optional(),
    returnDestination: z.string().optional(),
    purpose: z
      .string()
      .trim()
      .min(5, 'Business purpose must be at least 5 characters')
      .max(500, 'Business purpose cannot exceed 500 characters'),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional(),
    additionalColleagues: z.array(colleagueSchema).default([]),
  })
  .refine(
    (data) => {
      return data.pickupLocation.trim().toLowerCase() !== data.destination.trim().toLowerCase();
    },
    {
      message: 'Pickup location and destination cannot be identical',
      path: ['destination'],
    }
  )
  .refine(
    (data) => {
      if (!data.scheduledDeparture) return false;
      const iso = localDateTimeToIso(data.scheduledDeparture);
      const depDate = new Date(iso);
      if (isNaN(depDate.getTime())) return false;
      // Allow 2 minutes grace period for form filling
      return depDate.getTime() >= Date.now() - 120000;
    },
    {
      message: 'Scheduled departure cannot be in the past',
      path: ['scheduledDeparture'],
    }
  )
  .refine(
    (data) => {
      if (data.tripType === 'ROUND_TRIP') {
        if (!data.returnDeparture) return false;
        const depIso = localDateTimeToIso(data.scheduledDeparture);
        const retIso = localDateTimeToIso(data.returnDeparture);
        const depDate = new Date(depIso);
        const retDate = new Date(retIso);
        if (isNaN(depDate.getTime()) || isNaN(retDate.getTime())) return false;
        return retDate.getTime() > depDate.getTime();
      }
      return true;
    },
    {
      message: 'Return departure must be later than the outbound departure',
      path: ['returnDeparture'],
    }
  );

export type RequestFormValues = z.infer<typeof requestFormSchema>;
