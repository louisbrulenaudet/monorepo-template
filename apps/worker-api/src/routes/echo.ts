import type { EchoResponse } from "@repo/dtos-common/api";
import type { RequestIdVariables } from "hono/request-id";
import type * as z from "zod/mini";
import { zValidator } from "@hono/zod-validator";
import { EchoQuerySchema, EchoRequestSchema } from "@repo/dtos-common/api";
import { Hono } from "hono";

type EchoEnv = {
  Bindings: Env;
  Variables: RequestIdVariables;
};

const echo = new Hono<EchoEnv>();

/**
 * Takes the request id rather than the Context: zValidator's hook does not
 * receive the app's `Bindings`, so a helper typed on `Context<EchoEnv>` is not
 * assignable there.
 */
function validationErrorBody(error: z.core.$ZodError, requestId: string) {
  return {
    error: "Bad Request",
    requestId,
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}

echo.post(
  "/",
  // Query before json: the allocation-free query check gates the body read, so
  // a bad query parameter cannot force a full bodyLimit-sized parse first.
  zValidator("query", EchoQuerySchema, (result, c) =>
    result.success
      ? undefined
      : c.json(validationErrorBody(result.error, c.get("requestId")), 400),
  ),
  zValidator("json", EchoRequestSchema, (result, c) =>
    result.success
      ? undefined
      : c.json(validationErrorBody(result.error, c.get("requestId")), 400),
  ),
  (c) => {
    const { message } = c.req.valid("json");
    const { uppercase } = c.req.valid("query");

    const payload: EchoResponse = {
      message: uppercase === "true" ? message.toUpperCase() : message,
      receivedAt: new Date().toISOString(),
      requestId: c.get("requestId"),
    };

    return c.json(payload, 200, { "Cache-Control": "no-store" });
  },
);

export default echo;
