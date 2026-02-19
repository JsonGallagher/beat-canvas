"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "./ErrorBoundary";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <ErrorBoundary>{children}</ErrorBoundary>
    </TooltipProvider>
  );
}
