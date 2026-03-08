import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  public constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  public componentDidCatch(error: Error): void {
    console.error("FinMind UI error:", error);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-coral-500/50 bg-ink-900 p-6 text-slate-100">
          <h2 className="font-heading text-2xl">Something went wrong</h2>
          <p className="mt-2 text-slate-300">{this.state.message || "Unexpected UI error."}</p>
          <p className="mt-3 text-xs text-slate-400">Reload the app and try again.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
