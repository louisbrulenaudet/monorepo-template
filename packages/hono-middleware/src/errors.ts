import type { Context } from "hono";
import type { RequestIdVariables } from "hono/request-id";
import { HTTPException } from "hono/http-exception";
import * as z from "zod/mini";

type RequestIdEnv = { Variables: RequestIdVariables };

export function notFoundHandler<E extends RequestIdEnv>(c: Context<E>) {
  return c.json({ error: "Not Found", requestId: c.get("requestId") }, 404);
}

export function errorHandler<E extends RequestIdEnv>(
  error: Error,
  c: Context<E>,
) {
  const requestId = c.get("requestId");
  const status = error instanceof HTTPException ? error.status : 500;
  if (status >= 500) {
    console.error({
      requestId,
      status,
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  }
  if (error instanceof HTTPException) {
    const body = { error: error.message, requestId };
    if (error.cause instanceof z.core.$ZodError) {
      const issues = error.cause.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return c.json({ ...body, issues }, error.status);
    }
    return c.json(body, error.status);
  }
  return c.json({ error: "Internal server error", requestId }, 500);
}
