import type { EchoResponse } from "@repo/dtos-common/api";
import { EchoQuerySchema, EchoRequestSchema } from "@repo/dtos-common/api";
import { validator } from "@repo/hono-middleware";
import { Hono } from "hono";
import type { AppEnv } from "../app-env";

const echo = new Hono<AppEnv>();

echo.post(
  "/",
  // Query before json: the allocation-free query check gates the body read, so
  // a bad query parameter cannot force a full bodyLimit-sized parse first.
  validator("query", EchoQuerySchema),
  validator("json", EchoRequestSchema),
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
