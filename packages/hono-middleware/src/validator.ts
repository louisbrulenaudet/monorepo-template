import type { ValidationTargets } from "hono";
import type * as z from "zod/mini";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";

/** ZValidator whose failures reach errorHandler as a 400 with `issues`. */
export function validator<
  Target extends keyof ValidationTargets,
  Schema extends z.core.$ZodType,
>(target: Target, schema: Schema) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      throw new HTTPException(400, {
        message: "Bad Request",
        cause: result.error,
      });
    }
  });
}
