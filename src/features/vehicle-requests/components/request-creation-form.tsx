'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@tanstack/react-form';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Car,
} from 'lucide-react';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { requestService } from '@/services/request-service';
import { requestFormSchema, RequestFormValues } from '../schemas/request-form.schema';
import { localDateTimeToIso, isoToLocalDateTime } from '@/lib/utils/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const COMMON_LOCATIONS = [
  'Corporate HQ - 100 Enterprise Blvd, Metropolis',
  'Metro Technology Center - 450 Innovation Way',
  'Westside Logistics Hub - 88 Terminal Rd',
  'Metropolis International Airport (MET) - Terminal 2',
  'Executive Conference Center - 12 Grand Ave',
];

export function RequestCreationForm() {
  const router = useRouter();
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const users = useFleetFlowStore((s) => s.users);
  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Default departure: tomorrow at 09:00 local time
  const defaultDepartureStr = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return isoToLocalDateTime(d.toISOString());
  }, []);

  const defaultReturnStr = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return isoToLocalDateTime(d.toISOString());
  }, []);

  const form = useForm<RequestFormValues>({
    defaultValues: {
      tripType: 'ONE_WAY',
      pickupLocation: 'Corporate HQ - 100 Enterprise Blvd, Metropolis',
      destination: 'Metro Technology Center - 450 Innovation Way',
      scheduledDeparture: defaultDepartureStr,
      returnDeparture: defaultReturnStr,
      returnPickup: '',
      returnDestination: '',
      purpose: '',
      notes: '',
      additionalColleagues: [],
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      setFieldErrors({});

      // Validate with Zod
      const parseResult = requestFormSchema.safeParse(value);
      if (!parseResult.success) {
        const errors: Record<string, string> = {};
        parseResult.error.issues.forEach((issue) => {
          const path = issue.path.join('.');
          errors[path] = issue.message;
        });
        setFieldErrors(errors);
        setFormError('Please review and correct the errors below before submitting.');
        return;
      }

      setIsSubmitting(true);
      try {
        const outboundIso = localDateTimeToIso(value.scheduledDeparture);
        const returnIso =
          value.tripType === 'ROUND_TRIP' && value.returnDeparture
            ? localDateTimeToIso(value.returnDeparture)
            : undefined;

        const created = await requestService.createRequest({
          requesterId: currentUser.id,
          tripType: value.tripType,
          pickupLocation: value.pickupLocation.trim(),
          destination: value.destination.trim(),
          scheduledDeparture: outboundIso,
          returnDeparture: returnIso,
          returnPickup: value.returnPickup?.trim() || undefined,
          returnDestination: value.returnDestination?.trim() || undefined,
          purpose: value.purpose.trim(),
          notes: value.notes?.trim() || undefined,
          additionalColleagues: value.additionalColleagues.filter((c) => c.name.trim().length > 0),
        });

        router.push(`/employee/requests/${created.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create request';
        setFormError(message);
        setIsSubmitting(false);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-8"
    >
      {formError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="text-sm font-medium">{formError}</div>
        </div>
      )}

      {/* 1. Trip Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <Car className="h-5 w-5" />
            <CardTitle>Trip Configuration</CardTitle>
          </div>
          <CardDescription>
            Select whether you require a single one-way transfer or a coordinated round-trip journey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form.Field name="tripType">
            {(field) => (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => field.handleChange('ONE_WAY')}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    field.state.value === 'ONE_WAY'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-semibold text-sm">One-Way Journey</span>
                    {field.state.value === 'ONE_WAY' && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Single transfer from pickup location to destination.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => field.handleChange('ROUND_TRIP')}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    field.state.value === 'ROUND_TRIP'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-semibold text-sm">Round-Trip Journey</span>
                    {field.state.value === 'ROUND_TRIP' && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Coordinated outbound and return transfers for the day.
                  </p>
                </button>
              </div>
            )}
          </form.Field>
        </CardContent>
      </Card>

      {/* 2. Outbound Journey */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="h-5 w-5" />
            <CardTitle>Outbound Journey Details</CardTitle>
          </div>
          <CardDescription>
            Specify where and when the trip will commence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pickup */}
            <form.Field name="pickupLocation">
              {(field) => (
                <div className="space-y-1.5">
                  <label htmlFor="pickupLocation" className="text-sm font-medium">
                    Pickup Location <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="pickupLocation"
                    list="common-pickup-locations"
                    placeholder="Enter pickup address or facility"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <datalist id="common-pickup-locations">
                    {COMMON_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                  {fieldErrors.pickupLocation && (
                    <p className="text-xs text-destructive">{fieldErrors.pickupLocation}</p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Destination */}
            <form.Field name="destination">
              {(field) => (
                <div className="space-y-1.5">
                  <label htmlFor="destination" className="text-sm font-medium">
                    Destination <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="destination"
                    list="common-destination-locations"
                    placeholder="Enter destination address or facility"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <datalist id="common-destination-locations">
                    {COMMON_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                  {fieldErrors.destination && (
                    <p className="text-xs text-destructive">{fieldErrors.destination}</p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          {/* Scheduled Departure */}
          <form.Field name="scheduledDeparture">
            {(field) => (
              <div className="space-y-1.5 max-w-md">
                <label htmlFor="scheduledDeparture" className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Scheduled Departure Date & Time <span className="text-destructive">*</span></span>
                </label>
                <Input
                  id="scheduledDeparture"
                  type="datetime-local"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Time is interpreted in your local browser timezone.
                </p>
                {fieldErrors.scheduledDeparture && (
                  <p className="text-xs text-destructive">{fieldErrors.scheduledDeparture}</p>
                )}
              </div>
            )}
          </form.Field>
        </CardContent>
      </Card>

      {/* 3. Return Journey (Conditional) */}
      <form.Field name="tripType">
        {(tripTypeField) => {
          if (tripTypeField.state.value !== 'ROUND_TRIP') return null;

          return (
            <Card className="border-blue-200 bg-blue-50/20">
              <CardHeader>
                <div className="flex items-center gap-2 text-blue-700">
                  <RotateCcw className="h-5 w-5" />
                  <CardTitle>Return Journey Details</CardTitle>
                </div>
                <CardDescription>
                  Configure return timing. Pick-up defaults to outbound destination and returns to outbound origin unless overridden.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form.Field name="returnDeparture">
                  {(field) => (
                    <div className="space-y-1.5 max-w-md">
                      <label htmlFor="returnDeparture" className="text-sm font-medium flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Return Departure Date & Time <span className="text-destructive">*</span></span>
                      </label>
                      <Input
                        id="returnDeparture"
                        type="datetime-local"
                        value={field.state.value || ''}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {fieldErrors.returnDeparture && (
                        <p className="text-xs text-destructive">{fieldErrors.returnDeparture}</p>
                      )}
                    </div>
                  )}
                </form.Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <form.Field name="returnPickup">
                    {(field) => (
                      <div className="space-y-1.5">
                        <label htmlFor="returnPickup" className="text-sm font-medium text-muted-foreground">
                          Return Pickup (Optional Override)
                        </label>
                        <Input
                          id="returnPickup"
                          placeholder="Defaults to outbound destination"
                          value={field.state.value || ''}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="returnDestination">
                    {(field) => (
                      <div className="space-y-1.5">
                        <label htmlFor="returnDestination" className="text-sm font-medium text-muted-foreground">
                          Return Destination (Optional Override)
                        </label>
                        <Input
                          id="returnDestination"
                          placeholder="Defaults to outbound pickup"
                          value={field.state.value || ''}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  </form.Field>
                </div>
              </CardContent>
            </Card>
          );
        }}
      </form.Field>

      {/* 4. Passenger Manifest */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Users className="h-5 w-5" />
              <CardTitle>Passenger Manifest</CardTitle>
            </div>
            <form.Field name="additionalColleagues">
              {(field) => {
                const count = (field.state.value?.length || 0) + 1;
                return (
                  <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
                    {count} {count === 1 ? 'Total Passenger' : 'Total Passengers'}
                  </Badge>
                );
              }}
            </form.Field>
          </div>
          <CardDescription>
            You are automatically registered as Primary Passenger #1. Add any travelling colleagues below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary Requester Row */}
          <div className="p-3.5 rounded-lg border bg-muted/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                #1
              </div>
              <div>
                <div className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span>{currentUser.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Primary / Requester
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {currentUser.department || 'Employee'} • {currentUser.email}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Colleagues */}
          <form.Field name="additionalColleagues">
            {(field) => {
              const colleagues = field.state.value || [];

              const addColleague = () => {
                field.handleChange([
                  ...colleagues,
                  { name: '', employeeId: '', department: '' },
                ]);
              };

              const removeColleague = (index: number) => {
                field.handleChange(colleagues.filter((_, idx) => idx !== index));
              };

              const updateColleague = (
                index: number,
                subKey: 'name' | 'employeeId' | 'department',
                val: string
              ) => {
                const updated = [...colleagues];
                updated[index] = { ...updated[index], [subKey]: val };
                field.handleChange(updated);
              };

              return (
                <div className="space-y-3">
                  {colleagues.map((c, index) => (
                    <div
                      key={index}
                      className="p-3.5 rounded-lg border bg-card flex flex-col md:flex-row gap-3 items-start md:items-center"
                    >
                      <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        #{index + 2}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 w-full">
                        <Input
                          placeholder="Colleague Full Name *"
                          value={c.name}
                          onChange={(e) => updateColleague(index, 'name', e.target.value)}
                        />
                        <Input
                          placeholder="Employee ID (optional)"
                          value={c.employeeId || ''}
                          onChange={(e) => updateColleague(index, 'employeeId', e.target.value)}
                        />
                        <Input
                          placeholder="Department (optional)"
                          value={c.department || ''}
                          onChange={(e) => updateColleague(index, 'department', e.target.value)}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeColleague(index)}
                        className="text-muted-foreground hover:text-destructive shrink-0 self-end md:self-center"
                        aria-label="Remove colleague"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addColleague}
                    className="flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Travelling Colleague</span>
                  </Button>
                </div>
              );
            }}
          </form.Field>
        </CardContent>
      </Card>

      {/* 5. Business Purpose & Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <FileText className="h-5 w-5" />
            <CardTitle>Business Justification & Notes</CardTitle>
          </div>
          <CardDescription>
            Provide mandatory company business justification and any optional handling requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form.Field name="purpose">
            {(field) => (
              <div className="space-y-1.5">
                <label htmlFor="purpose" className="text-sm font-medium">
                  Business Purpose <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="purpose"
                  placeholder="e.g. Attending quarterly executive client review and technical architecture session"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  Required for travel approval auditing (5 - 500 characters).
                </p>
                {fieldErrors.purpose && (
                  <p className="text-xs text-destructive">{fieldErrors.purpose}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="notes">
            {(field) => (
              <div className="space-y-1.5">
                <label htmlFor="notes" className="text-sm font-medium text-muted-foreground">
                  Special Instructions or Vehicle Notes (Optional)
                </label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Large cargo space needed for presentation displays; airport curbside pickup"
                  value={field.state.value || ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            )}
          </form.Field>
        </CardContent>
      </Card>

      {/* Submit Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
          <span>{isSubmitting ? 'Submitting Request...' : 'Submit Vehicle Request'}</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
