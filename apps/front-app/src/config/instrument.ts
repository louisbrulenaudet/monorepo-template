import { initSentry } from "#/config/sentry";

// main.tsx imports this first, in its own import block, so Sentry also sees
// errors thrown while the rest of the app's modules evaluate.
export const rootOptions = initSentry();
