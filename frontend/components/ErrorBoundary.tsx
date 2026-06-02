"use client";

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] items-center justify-center rounded-3xl border border-white/10 bg-slate-950/80 p-8">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">Something went wrong</p>
            <p className="mt-4 text-slate-400">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={this.handleRetry}
              className="btn-primary mt-6 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
