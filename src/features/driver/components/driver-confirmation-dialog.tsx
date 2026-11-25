import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { DriverNextActionDescriptor } from '../types/view-models';

interface DriverConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  actionDescriptor: DriverNextActionDescriptor | null;
  isLoading: boolean;
}

export function DriverConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  actionDescriptor,
  isLoading,
}: DriverConfirmationDialogProps) {
  if (!actionDescriptor) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              {actionDescriptor.dialogTitle}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            {actionDescriptor.dialogDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/40 p-3 rounded-lg border border-border text-xs space-y-1 my-2">
          <span className="font-semibold text-foreground block">Action Summary:</span>
          <p className="text-muted-foreground">{actionDescriptor.actionNarrative}</p>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto font-semibold gap-1.5"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            <span>{actionDescriptor.confirmLabel}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
