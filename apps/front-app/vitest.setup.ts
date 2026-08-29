import { afterEach } from "vitest";

declare global {
  // `var` is the only declaration form that augments globalThis.
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Only DOM suites (`@vitest-environment happy-dom`) need the harness; importing
// it unconditionally costs every Node suite ~600ms. Vitest globals are off, so
// RTL's auto-cleanup never registers, and `isolate: false` would leak DOM state
// across files without the explicit afterEach.
if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");
  afterEach(cleanup);
}
