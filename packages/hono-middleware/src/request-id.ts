import type { RequestIdVariables } from "hono/request-id";
import { CorsExposedHeader } from "@repo/enums-common";
import { setTag } from "@sentry/hono/cloudflare";
import { createMiddleware } from "hono/factory";

export const requestIdMiddleware = createMiddleware<{
  Variables: RequestIdVariables;
}>(async function requestId(c, next) {
  const id = crypto.randomUUID();
  c.set("requestId", id);
  setTag("request_id", id);
  await next();
  c.header(CorsExposedHeader.X_REQUEST_ID, id);
});
