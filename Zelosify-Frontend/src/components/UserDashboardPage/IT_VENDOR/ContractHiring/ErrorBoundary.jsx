"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/UI/shadcn/button";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("vendor_contract_hiring_ui_error", {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-border bg-card p-8 text-center">
        <div className="max-w-md space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Unexpected UI error</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This section crashed while rendering. Try reloading this view.
            </p>
          </div>
          <Button onClick={this.handleReset} variant="outline" size="sm" className="border-border">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry section
          </Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
