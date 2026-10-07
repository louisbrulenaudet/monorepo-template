import { rootOptions } from "#/config/instrument";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ErrorBoundary } from "#/components/feedback/ErrorBoundary";
import { queryClient } from "#/config/query-client";
import { startSentryTracing } from "#/config/sentry";
import { router } from "#/router";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing #root element");
}

window.addEventListener("vite:preloadError", () => {
  const key = "vite-preload-error-reloaded";
  try {
    if (sessionStorage.getItem(key)) {
      return;
    }
    sessionStorage.setItem(key, "1");
  } catch {
    return;
  }
  window.location.reload();
});

createRoot(rootElement, rootOptions).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);

void startSentryTracing(router);
