import type { Hono } from "hono";
import { methodNotAllowed } from "hono/method-not-allowed";
import type { BaseBindings, HonoEnv } from "./env";

export function jsonMethodNotAllowed<Bindings extends BaseBindings>(
  app: Hono<HonoEnv<Bindings>>,
) {
  return methodNotAllowed({
    app,
    onMethodNotAllowed: (c, methods) =>
      c.json(
        { error: "Method Not Allowed", requestId: c.get("requestId") },
        405,
        { Allow: methods.join(", ") },
      ),
  });
}
