"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "./ErrorBoundary";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <ErrorBoundary>{children}</ErrorBoundary>
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{ className: "font-mono text-xs border-border" }}
      />
    </TooltipProvider>
  );
}
