"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isWebGLError = this.state.error?.message?.includes("WebGL") ||
        this.state.error?.message?.includes("context");

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h3 className="font-serif text-xl text-foreground">
            {isWebGLError ? "Graphics Error" : "Something went wrong"}
          </h3>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {isWebGLError
              ? "Your GPU context was lost. This can happen when your device runs low on graphics memory."
              : this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button variant="outline" onClick={this.handleReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
