import { Component, type ReactNode } from "react";
import { RouteErrorFallback } from "#/components/feedback/RouteErrorFallback";

export type ErrorBoundaryProps = Readonly<{
  children: ReactNode;
}>;

type ErrorBoundaryState = { caught: false } | { caught: true; error: unknown };

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { caught: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { caught: true, error };
  }

  override render(): ReactNode {
    const { state } = this;

    if (state.caught) {
      return (
        <main className="px-4">
          <RouteErrorFallback
            error={state.error}
            title="The application crashed."
          />
        </main>
      );
    }

    return this.props.children;
  }
}
