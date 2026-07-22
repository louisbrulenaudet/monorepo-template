import { Component, type ErrorInfo, type ReactNode } from "react";

export type ErrorBoundaryProps = Readonly<{
  children: ReactNode;
}>;

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Uncaught error in React tree", error, info);
  }

  override render(): ReactNode {
    const { error } = this.state;

    if (error) {
      return (
        <div
          role="alert"
          className="flex min-h-dvh flex-col items-center justify-center gap-2 text-foreground"
        >
          <p className="font-medium">The application crashed.</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
