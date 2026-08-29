import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

declare global {
  // `var` is the only declaration form that augments globalThis.
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Vitest globals are off, so RTL's auto-cleanup never registers; with
// `isolate: false` a missed cleanup would leak DOM state across files.
afterEach(cleanup);
