import type { AnyRouter } from "@tanstack/react-router";
import type { RootOptions } from "react-dom/client";
import { AppEnvironment } from "@repo/enums-common";
import {
  type Breadcrumb,
  captureException,
  type ErrorEvent,
  type EventHint,
  init,
  reactErrorHandler,
} from "@sentry/react";
import { apiBaseUrl, appEnvironment } from "#/config/env";
import { version } from "../../package.json";

// Mirrors worker-api, which continues the SPA's sampling decision.
const FULL_TRACING_ENVIRONMENTS = new Set<AppEnvironment>([
  AppEnvironment.DEV,
  AppEnvironment.PREVIEW,
]);
const SAMPLED_TRACES_RATE = 0.01;
const URL_BREADCRUMB_KEYS = ["url", "from", "to"] as const;

function stripSearchAndHash(url: string): string {
  const end = url.search(/[?#]/);
  return end === -1 ? url : url.slice(0, end);
}

// Console text and query strings can carry sensitive user data.
function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === "console") {
    return null;
  }
  const { data } = breadcrumb;
  if (data) {
    for (const key of URL_BREADCRUMB_KEYS) {
      const value: unknown = data[key];
      if (typeof value === "string") {
        data[key] = stripSearchAndHash(value);
      }
    }
  }
  return breadcrumb;
}

const sentryEventIds = new WeakMap<object, string>();
const sentryEventIdListeners = new Set<() => void>();

/** @internal */
export function rememberSentryEventId(
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent {
  const error = hint.originalException;
  if (event.event_id && typeof error === "object" && error !== null) {
    sentryEventIds.set(error, event.event_id);
    for (const listener of sentryEventIdListeners) {
      listener();
    }
  }
  return event;
}

export function subscribeToSentryEventIds(listener: () => void): () => void {
  sentryEventIdListeners.add(listener);
  return () => {
    sentryEventIdListeners.delete(listener);
  };
}

export function sentryEventId(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  return sentryEventIds.get(error);
}

// Every entry point reads VITE_SENTRY_DSN literally, not through env.ts: the
// inlined value lets the build drop the whole SDK when the DSN is unset.
// `undefined` keeps React's default console reporting when Sentry is off.
export function initSentry(): RootOptions | undefined {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    return undefined;
  }

  init({
    dsn,
    environment: appEnvironment,
    release: `front-app@${version}`,
    tracesSampleRate: FULL_TRACING_ENVIRONMENTS.has(appEnvironment)
      ? 1
      : SAMPLED_TRACES_RATE,
    ...(apiBaseUrl ? { tracePropagationTargets: [apiBaseUrl] } : {}),
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: rememberSentryEventId,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
  });

  const reportReactError = reactErrorHandler();

  const reportRootError: NonNullable<RootOptions["onUncaughtError"]> = (
    error,
    { componentStack },
  ) => reportReactError(error, { componentStack: componentStack ?? null });

  return {
    onUncaughtError: reportRootError,
    onCaughtError: reportRootError,
    onRecoverableError: reportReactError,
  };
}

// Loaded after first render: ~23 KB gzip that 99% of sessions never use. The
// pageload span still starts at the navigation time origin.
export async function startSentryTracing(router: AnyRouter): Promise<void> {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    return;
  }
  const { addRouterTracing } = await import("#/config/sentry-tracing");
  addRouterTracing(router);
}

export function captureClientError(error: unknown): void {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    return;
  }
  captureException(error);
}
