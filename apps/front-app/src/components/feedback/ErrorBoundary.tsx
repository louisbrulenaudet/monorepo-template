import { Component, type ErrorInfo, type ReactNode } from "react";
import { RouteErrorFallback } from "#/components/feedback/RouteErrorFallback";

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
        <RouteErrorFallback error={error} title="The application crashed." />
      );
    }

    return this.props.children;
  }
}
