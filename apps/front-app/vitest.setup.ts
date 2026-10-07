import { afterEach } from "vitest";

declare global {
  // `var` is the only declaration form that augments globalThis.
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { cleanup, configure } = await import("@testing-library/react");
  configure({ reactStrictMode: true });
  afterEach(cleanup);
}
