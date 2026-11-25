'use client';

import * as React from 'react';
import {
  Check,
  Car,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TripLegStatus } from '@/types/domain';

export interface TripLifecycleStepItem {
  status: TripLegStatus;
  step: number;
  percentage: number;
  label: string;
  shortLabel?: string;
  description?: string;
}

export interface TripLifecycleStepperProps {
  currentStatus: TripLegStatus;
  steps: readonly TripLifecycleStepItem[];
  className?: string;
}

/**
 * TripLifecycleStepper
 *
 * Responsive, accessible trip execution stepper that renders an injected lifecycle configuration.
 * Contains ZERO internal hardcoded milestones or duplicated business calculations.
 *
 * Presentation Tiers:
 * - Desktop (>= 1024px): Full horizontal milestone track with status nodes, connector lines, and labels.
 * - Tablet (768px - 1023px): Connected milestone nodes with active status banner.
 * - Mobile (< 768px): Compact milestone badge, linear progress gauge, and collapsible disclosure.
 */
export function TripLifecycleStepper({
  currentStatus,
  steps,
  className,
}: TripLifecycleStepperProps) {
  const [mobileExpanded, setMobileExpanded] = React.useState(false);

  // Find step index from injected steps array
  const stepIndex = steps.findIndex((s) => s.status === currentStatus);
  const activeIndex = stepIndex >= 0 ? stepIndex : 0;
  const currentConfig = steps[activeIndex];

  const totalSteps = steps.length || 8;
  const currentStepNumber = currentConfig?.step ?? (activeIndex + 1);
  const progressPercentage =
    currentConfig?.percentage ?? Math.round(((activeIndex + 1) / totalSteps) * 100);
  const activeLabel = currentConfig?.label ?? currentStatus;
  const activeDescription = currentConfig?.description ?? '';

  return (
    <div
      role="region"
      aria-label="Trip Execution Progress"
      className={cn(
        'rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-colors',
        className
      )}
    >
      {/* Screen reader summary announcement */}
      <div className="sr-only">
        Trip Status: Step {currentStepNumber} of {totalSteps}, {activeLabel}. Overall Progress:{' '}
        {progressPercentage} percent. {activeDescription}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. DESKTOP VIEW (>= 1024px): Full Horizontal Milestone Track       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary motion-safe:animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Journey Execution Lifecycle
            </h4>
          </div>
          <span className="font-mono text-xs font-semibold text-primary">
            Step {currentStepNumber} of {totalSteps} • {progressPercentage}% Complete
          </span>
        </div>

        <ol role="list" className="relative flex items-center justify-between w-full">
          {steps.map((stepItem, idx) => {
            const isCompleted = idx < activeIndex;
            const isCurrent = idx === activeIndex;
            const isPending = idx > activeIndex;

            return (
              <li
                key={stepItem.status}
                aria-current={isCurrent ? 'step' : undefined}
                className="relative flex flex-1 flex-col items-center group"
              >
                {/* Connecting Line Segment (rendered between nodes) */}
                {idx > 0 && (
                  <div
                    className={cn(
                      'absolute top-4 -left-1/2 w-full h-0.5 -translate-y-1/2',
                      isCompleted ? 'bg-primary' : 'bg-muted'
                    )}
                    aria-hidden="true"
                  />
                )}

                {/* Milestone Node */}
                <div
                  className={cn(
                    'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold shadow-xs transition-colors',
                    isCompleted &&
                      'bg-primary text-primary-foreground border-2 border-primary ring-2 ring-primary/20',
                    isCurrent &&
                      'bg-background text-primary border-2 border-primary ring-4 ring-primary/20 font-bold',
                    isPending &&
                      'bg-muted/60 text-muted-foreground border border-border'
                  )}
                  aria-hidden="true"
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 stroke-[2.5]" />
                  ) : (
                    <span>{stepItem.step}</span>
                  )}
                </div>

                {/* Milestone Label */}
                <span
                  className={cn(
                    'mt-2 text-center text-xs tracking-tight line-clamp-1 max-w-[100px] px-1',
                    isCurrent && 'font-bold text-primary',
                    isCompleted && 'font-medium text-foreground',
                    isPending && 'font-normal text-muted-foreground/70'
                  )}
                  title={`${stepItem.step}. ${stepItem.label}`}
                >
                  {stepItem.shortLabel || stepItem.label}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Current Active Step Banner on Desktop */}
        <div className="mt-4 rounded-lg bg-muted/40 border border-border/60 px-3.5 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Current Milestone:</span>
            <span className="font-medium text-primary">{activeLabel}</span>
          </div>
          {activeDescription && (
            <span className="text-muted-foreground italic">{activeDescription}</span>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. TABLET VIEW (768px - 1023px): Compact Node Track + Status Banner */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block lg:hidden space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Journey Milestone Track
          </span>
          <span className="font-mono text-xs font-semibold text-primary">
            Step {currentStepNumber} of {totalSteps} ({progressPercentage}%)
          </span>
        </div>

        {/* Connected Node Track */}
        <div className="relative flex items-center justify-between px-2">
          {steps.map((stepItem, idx) => {
            const isCompleted = idx < activeIndex;
            const isCurrent = idx === activeIndex;

            return (
              <div key={stepItem.status} className="relative flex flex-col items-center">
                {idx > 0 && (
                  <div
                    className={cn(
                      'absolute top-3.5 -left-1/2 w-full h-0.5 -translate-y-1/2',
                      isCompleted ? 'bg-primary' : 'bg-muted'
                    )}
                    aria-hidden="true"
                  />
                )}
                <div
                  className={cn(
                    'relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    isCompleted && 'bg-primary text-primary-foreground border border-primary',
                    isCurrent && 'bg-background text-primary border-2 border-primary ring-4 ring-primary/25 font-bold',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground border border-border'
                  )}
                  title={`${stepItem.step}. ${stepItem.label}`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : stepItem.step}
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Banner */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs flex items-start gap-2.5">
          <Car className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            <div className="font-semibold text-foreground">
              Step {currentStepNumber} of {totalSteps}: {activeLabel}
            </div>
            {activeDescription && (
              <div className="text-muted-foreground">{activeDescription}</div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. MOBILE VIEW (< 768px): Compact Milestone Badge & Progress Gauge */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="block md:hidden space-y-3">
        {/* Header: Milestone Badge & Progress Percentage */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-2 w-2 rounded-full bg-primary shrink-0" aria-hidden="true" />
            <span className="truncate text-xs font-bold text-foreground">
              Step {currentStepNumber} of {totalSteps}: {activeLabel}
            </span>
          </div>

          <span className="font-mono text-xs font-bold text-primary shrink-0">
            {progressPercentage}%
          </span>
        </div>

        {/* Linear Progress Gauge */}
        <div
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`Step ${currentStepNumber} of ${totalSteps}: ${activeLabel}`}
          className="relative h-2 w-full overflow-hidden rounded-full bg-muted border border-border/50"
        >
          <div
            className="h-full rounded-full bg-primary motion-safe:transition-all motion-safe:duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Contextual Description */}
        {activeDescription && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {activeDescription}
          </p>
        )}

        {/* Mobile Collapsible Milestones Trigger */}
        <div className="pt-1 border-t border-border/60">
          <button
            type="button"
            onClick={() => setMobileExpanded((prev) => !prev)}
            aria-expanded={mobileExpanded}
            aria-controls="mobile-lifecycle-milestones-list"
            className="w-full flex items-center justify-between min-h-[44px] py-2 text-xs font-semibold text-primary hover:text-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md transition-colors"
          >
            <span>{mobileExpanded ? 'Hide Milestone Breakdown' : `View All ${totalSteps} Milestones`}</span>
            {mobileExpanded ? (
              <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
          </button>

          {/* Collapsible Milestone List */}
          {mobileExpanded && (
            <ol
              id="mobile-lifecycle-milestones-list"
              className="mt-2 space-y-2.5 pb-1 border-l-2 border-muted ml-3 pl-3"
            >
              {steps.map((stepItem, idx) => {
                const isCompleted = idx < activeIndex;
                const isCurrent = idx === activeIndex;

                return (
                  <li
                    key={stepItem.status}
                    className="flex items-start gap-2.5 text-xs"
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold mt-0.5',
                        isCompleted && 'bg-primary text-primary-foreground',
                        isCurrent && 'bg-background text-primary border-2 border-primary ring-2 ring-primary/30',
                        !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                      )}
                      aria-hidden="true"
                    >
                      {isCompleted ? <Check className="h-3 w-3 stroke-[2.5]" /> : stepItem.step}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          'font-medium leading-tight',
                          isCurrent && 'font-bold text-primary',
                          isCompleted && 'text-foreground',
                          !isCompleted && !isCurrent && 'text-muted-foreground'
                        )}
                      >
                        {stepItem.step}. {stepItem.label}
                      </div>
                      {stepItem.description && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {stepItem.description}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
