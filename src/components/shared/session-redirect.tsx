"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFleetFlowStore } from "@/stores/fleetflow-store";

/**
 * Shared component for hydration-safe root session redirection.
 * Evaluates current persona role upon store rehydration and navigates to the appropriate portal.
 */
export function SessionRedirect() {
  const router = useRouter();
  const isHydrated = useFleetFlowStore((s) => s.isHydrated);
  const currentUserId = useFleetFlowStore((s) => s.currentUserId);
  const users = useFleetFlowStore((s) => s.users);

  React.useEffect(() => {
    if (!isHydrated) return;

    const currentUser = users.find((u) => u.id === currentUserId);
    if (!currentUser) {
      router.replace("/login");
    } else if (currentUser.role === "EMPLOYEE") {
      router.replace("/employee/dashboard");
    } else if (currentUser.role === "ADMIN") {
      router.replace("/admin/dashboard");
    } else if (currentUser.role === "DRIVER") {
      router.replace("/driver/dashboard");
    } else {
      router.replace("/login");
    }
  }, [isHydrated, currentUserId, users, router]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground font-medium">
        Redirecting to your FleetFlow workspace...
      </p>
    </div>
  );
}
