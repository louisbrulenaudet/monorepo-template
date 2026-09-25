import type { AnyRouter } from "@tanstack/react-router";
import {
  addIntegration,
  tanstackRouterBrowserTracingIntegration,
} from "@sentry/react";

export function addRouterTracing(router: AnyRouter): void {
  addIntegration(tanstackRouterBrowserTracingIntegration(router));
}
